const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ツール類の読み込み
const DBPerf = require('../Tools/DBPref');
const VCM = require('../Tools/VerifyCookieMiddleware');
const decrypt = require('../Tools/AESControl');
const CreateTransferTx = require('../Tools/CreateTransferTx');
const SignAndAnnounce = require('../Tools/SignAndAnnounce');

// ==============================
// 予約管理 (オンメモリ)
// ==============================

const pendingTransfers = new Map();
const RESERVATION_TTL = 30 * 1000; // 30秒
const CLEANUP_INTERVAL = 60 * 1000; // 1分ごとに掃除

// 定期クリーンアップ処理（メモリリーク対策）
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of pendingTransfers.entries()) {
        if (now - data.createdAt > RESERVATION_TTL) {
            pendingTransfers.delete(id);
        }
    }
}, CLEANUP_INTERVAL);


// ==============================
// 1. 予約作成 (Web画面から叩く)
// ==============================

router.post('/SendTokenReserve', VCM('LoginToken', process.env.LOGIN_SECRET), async (req, res) => {
    try {
        const { sendtoUserID, Amount } = req.body;
        const fromUserID = req.auth.userID;

        // 入力値バリデーション
        if (!sendtoUserID || !Amount || isNaN(Amount)) {
            return res.status(400).json({ message: '不正なパラメータです' });
        }

        // reservationID生成 (UUID)
        const reservationID = crypto.randomUUID();

        // メモリに保存
        pendingTransfers.set(reservationID, {
            fromUserID,
            sendtoUserID,
            Amount,
            createdAt: Date.now()
        });

        console.log(`[Reserve] ID:${reservationID} Created by User:${fromUserID}`);

        return res.status(200).json({
            message: "カードをかざしてください",
            reservationID,
            expiresIn: RESERVATION_TTL / 1000 // フロントエンド表示用(秒)
        });

    } catch (error) {
        console.error("Reserve Error:", error);
        return res.status(500).json({ message: "予約処理に失敗しました" });
    }
});


// ==============================
// 2. NFC検知 → 送金実行 (リーダーから叩く)
// ==============================

router.post('/NFC', async (req, res) => {
    const { uid, reservationID } = req.body;

    // 1. 基本パラメータチェック
    if (!uid || !reservationID) {
        return res.status(400).send("パラメータが不足しています");
    }

    // 2. 予約存在チェック
    const transfer = pendingTransfers.get(reservationID);

    if (!transfer) {
        return res.status(400).send("予約が存在しないか、期限切れです");
    }

    // 3. 【重要】二重送金防止（アトミック性確保）
    // 処理を開始する前にMapから削除します。
    // これにより、カードを連打しても2回目は「予約なし」となり弾かれます。
    pendingTransfers.delete(reservationID);

    // 4. TTL最終確認（念のため）
    if (Date.now() - transfer.createdAt > RESERVATION_TTL) {
        return res.status(400).send("予約期限切れです。最初からやり直してください。");
    }

    try {
        const { fromUserID, sendtoUserID, Amount } = transfer;

        // ==========================
        // DB照合プロセス
        // ==========================

        // A. カード所有者確認
        const cardUser = await DBPerf(
            "UID確認",
            "SELECT userID FROM NFC WHERE UID = ?",
            [uid]
        );

        if (!cardUser.length) {
            return res.status(400).send("未登録のカードです");
        }

        // 予約した人とカードをかざした人が一致するか？
        if (cardUser[0].userID !== fromUserID) {
            console.warn(`[Security] ID mismatch. Reserve:${fromUserID}, Card:${cardUser[0].userID}`);
            return res.status(403).send("予約したアカウントのカードではありません");
        }

        // B. 送金元情報の取得 (秘密鍵など)
        const fromUserInfor = await DBPerf(
            "送金元取得",
            "SELECT Password, PrivateKey FROM IdentifyTable WHERE UserID = ?",
            [fromUserID]
        );

        // C. 送金先情報の取得 (アドレス)
        const toUserInfor = await DBPerf(
            "送金先取得",
            "SELECT Address FROM IdentifyTable WHERE UserID = ?",
            [sendtoUserID]
        );

        if (!fromUserInfor.length || !toUserInfor.length) {
            return res.status(400).send("ユーザー情報が見つかりません");
        }

        const { Password: password, PrivateKey: privateKey } = fromUserInfor[0];
        const SendToAddress = toUserInfor[0].Address;

        // D. モザイク情報の取得
        // (注: エラーハンドリングを追加しています)
        const roomName = await DBPerf("Room取得", "SELECT RoomName FROM Rooms WHERE userID = ?", [fromUserID]);
        if (!roomName.length) throw new Error("Roomが見つかりません");

        const mosaicName = await DBPerf("Mosaic名取得", "SELECT MosaicName FROM RoomDetails WHERE RoomName = ?", [roomName[0].RoomName]);
        if (!mosaicName.length) throw new Error("Mosaic名が見つかりません");

        const mosaicIDList = await DBPerf("MosaicID取得", "SELECT MosaicID FROM Mosaics WHERE MosaicName = ?", [mosaicName[0].MosaicName]);
        if (!mosaicIDList.length) throw new Error("MosaicIDが見つかりません");
        
        const MosaicID = mosaicIDList[0].MosaicID;

        // ==========================
        // ブロックチェーン処理
        // ==========================

        // 秘密鍵の復号
        const decryptedPrivateKey = decrypt(password, privateKey);

        // トランザクション作成
        const { tx, keyPair, facade } = CreateTransferTx({
            networkType: 'testnet',
            senderPrivateKey: decryptedPrivateKey,
            recipientRawAddress: SendToAddress,
            message: `Payment via NFC`, // メッセージは簡潔に
            mosaics: [
                { mosaicId: MosaicID, amount: BigInt(Amount) * 1_000_000n } // Amountが整数の場合
            ],
            deadlineHours: 2,
        });

        // 署名とアナウンス
        await SignAndAnnounce(
            tx,
            keyPair,
            facade,
            'https://sym-test-01.opening-line.jp:3001'
        );

        console.log(`[Success] Transfer Complete. User:${fromUserID} -> ${sendtoUserID}, Amount:${Amount}`);
        return res.status(200).send("送金完了");

    } catch (err) {
        console.error("[Transaction Error]", err);
        // 注: ここでエラーになっても、pendingTransfersからは削除済みなので
        // ユーザーには「もう一度最初から操作してください」と伝えるのが正しい挙動です。
        return res.status(500).send("送金処理に失敗しました。最初から操作をやり直してください。");
    }
});

module.exports = router;