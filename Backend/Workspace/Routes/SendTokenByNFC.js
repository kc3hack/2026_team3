import express from 'express';
import crypto from 'crypto';

// ツール類
import DBPerf from '../Tools/DBPerf.js';
import VCM from '../Tools/VCM.js'; // VCM.jsから修正が必要な場合は適宜合わせてください
import { decrypt } from '../Tools/AESControl.js';       // named exportから default export に合わせました
import CreateTransferTx from '../Tools/CreateTransferTx.js';
import SignAndAnnounce from '../Tools/SignAndAnnounce.js';
import { LeftTokenAmount } from '../Tools/LeftToken.js';
import argon2 from 'argon2';

const router = express.Router();

// ==============================
// 0. 残高取得 (Payment画面表示時)
// ==============================
router.get('/', VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), async (req, res) => {
    try {
        const userId = req.auth.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const room = await DBPerf("Room取得", "SELECT RoomName FROM Rooms WHERE userID = ?", [userId]);
        if (!room.length) throw new Error("Room が見つかりません");

        const mosaicName = await DBPerf("Mosaic名取得", "SELECT MosaicName FROM RoomDetails WHERE RoomName = ?", [room[0].RoomName]);
        if (!mosaicName.length) throw new Error("Mosaic が見つかりません");

        const mosaicIdList = await DBPerf("MosaicID取得", "SELECT MosaicID FROM Mosaic WHERE MosaicName = ?", [mosaicName[0].MosaicName]);
        if (!mosaicIdList.length) throw new Error("MosaicID が見つかりません");

        const targetMosaicId = mosaicIdList[0].MosaicID; 
        console.log("[Debug] targetMosaicId:", targetMosaicId);

        const userInfo = await DBPerf("Address取得", "SELECT Address FROM Identify WHERE UserID = ?", [userId]);
        if (!userInfo.length) throw new Error("ユーザーのアドレスが見つかりません");

        const userAddress = userInfo[0].Address;
        const nodeUrl = 'https://sym-test-01.opening-line.jp:3001';

        const balance = await LeftTokenAmount(userAddress, targetMosaicId, nodeUrl);

        return res.status(200).json({ HandToken: Number(balance) });

    } catch (error) {
        console.error('Get Balance Error:', error);
        return res.status(500).json({ message: '残高取得に失敗しました' });
    }
});


// ==============================
// 予約管理 (オンメモリ - 改札セッション)
// ==============================
const pendingTransfers = new Map();
const SESSION_TTL = 10 * 60 * 1000; // 連続受付用にセッション寿命を10分に延長
const CLEANUP_INTERVAL = 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [id, data] of pendingTransfers.entries()) {
        if (now - data.updatedAt > SESSION_TTL) {
            pendingTransfers.delete(id);
        }
    }
}, CLEANUP_INTERVAL);


// ==============================
// 1. 予約作成 (Web画面から「受付開始」)
// ==============================
router.post('/NFC/Submit', VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), async (req, res) => {
    try {
        const { sendtoUserID, Amount } = req.body;
        const fromUserID = req.auth.userId;

        if (!sendtoUserID || !Amount || isNaN(Amount)) {
            return res.status(400).json({ message: '不正なパラメータです' });
        }

        const reservationID = crypto.randomUUID();

        pendingTransfers.set(reservationID, {
            fromUserID,
            sendtoUserID,
            Amount,
            updatedAt: Date.now(),
            processedUids: {} // 【追加】二重引き落とし防止のための履歴
        });

        console.log(`[Gate Session Started] ID:${reservationID} by User:${fromUserID}`);

        return res.status(200).json({
            message: "受付を開始しました",
            reservationID
        });

    } catch (error) {
        console.error("Reserve Error:", error);
        return res.status(500).json({ message: "予約処理に失敗しました" });
    }
});


// ==============================
// 2. NFC検知 → 送金実行 (改札処理)
// ==============================
router.post('/NFC', async (req, res) => {
    const { uid, reservationID, encrypted_password } = req.body;
    console.log("/NFC-API is running!", { uid, reservationID, encrypted_password });



    // ExpressのappインスタンスからSocket.ioを取得 (server.jsで app.set('io', io) されている前提)
    const io = req.app.get('io'); 

    if (!uid || !reservationID) {
        return res.status(400).send("パラメータが不足しています");
    }

    const transfer = pendingTransfers.get(reservationID);

    if (!transfer) {
        return res.status(400).send("受付セッションが終了しているか、無効です");
    }

    // 【重要】同一カードの連続タッチ防止 (10秒以内の同一UIDは弾く)
    const now = Date.now();
    if (transfer.processedUids[uid] && (now - transfer.processedUids[uid] < 10000)) {
        console.log(`[CoolDown] UID:${uid} is cooling down.`);
        if (io) io.emit('payment:result', { reservationID, status: 'cooldown' });
        return res.status(400).send("連続タッチです");
    }
    
    // タッチ時間を記録してセッション寿命を延長
    transfer.processedUids[uid] = now;
    transfer.updatedAt = now;

    try {
        const { fromUserID, sendtoUserID, Amount } = transfer;

        // A. カード所有者確認
        const cardUser = await DBPerf("UID確認", "SELECT userID FROM NFC WHERE UID = ?", [uid]);
        if (!cardUser.length) throw new Error("未登録のカードです");
        if (cardUser[0].userID !== fromUserID) {
            throw new Error("あなたのアカウントのカードではありません");
        }

        // B. 送金元情報
        const fromUserInfor = await DBPerf("送金元取得", "SELECT Password, PrivateKey FROM Identify WHERE UserID = ?", [fromUserID]);
        const toUserInfor = await DBPerf("送金先取得", "SELECT Address FROM Identify WHERE UserID = ?", [sendtoUserID]);
        if (!fromUserInfor.length || !toUserInfor.length) throw new Error("ユーザー情報が見つかりません");

        const { Password: password, PrivateKey: privateKey } = fromUserInfor[0];
        const SendToAddress = toUserInfor[0].Address;

        // D. モザイク情報
        const roomName = await DBPerf("Room取得", "SELECT RoomName FROM Rooms WHERE userID = ?", [fromUserID]);
        const mosaicName = await DBPerf("Mosaic名取得", "SELECT MosaicName FROM RoomDetails WHERE RoomName = ?", [roomName[0].RoomName]);
        const mosaicIDList = await DBPerf("MosaicID取得", "SELECT MosaicID FROM Mosaic WHERE MosaicName = ?", [mosaicName[0].MosaicName]);
        const MosaicIDHex = mosaicIDList[0].MosaicID; 
        const nodeUrl = 'https://sym-test-01.opening-line.jp:3001';

        const fromAddressInfo = await DBPerf("送金元Address取得", "SELECT Address FROM Identify WHERE UserID = ?", [fromUserID]);
        if (!fromAddressInfo.length) throw new Error("送金元アドレスが見つかりません");

        const currentAmount = await LeftTokenAmount(fromAddressInfo[0].Address, MosaicIDHex, nodeUrl);
        const transferAmount = BigInt(Amount) * 1_000_000n;
        if (currentAmount < transferAmount) {
            throw new Error("残高不足です");
        }

        // ブロックチェーン処理

        // 1. NFCから受け取った文字列("iv:data:tag")をオブジェクトに復元する
        let parsedEncryptedPassword = null;
        if (typeof encrypted_password === 'string' && encrypted_password.includes(':')) {
            const parts = encrypted_password.split(':');
            parsedEncryptedPassword = {
                iv: parts[0],
                data: parts[1],
                tag: parts[2]
            };
            console.log("[Debug] パスワードをオブジェクトに復元しました:", parsedEncryptedPassword);
        }
        
        const pepper = process.env.PEPPER;
        if (!pepper) {
            throw new Error("サーバー設定エラー: PEPPER が未設定です");
        }

        if (!parsedEncryptedPassword) {
            return res.status(400).send("パスワード情報が不足しています");
        }

        const plainPassword = decrypt(pepper, parsedEncryptedPassword);

        const encryptedPrivateKeyObj = typeof privateKey === 'string' ? JSON.parse(privateKey) : privateKey;
        const decryptedPrivateKey = decrypt(plainPassword + pepper, encryptedPrivateKeyObj);
        console.log("[Debug] Decrypted Private Key:", decryptedPrivateKey);
        
        const { tx, keyPair, facade } = CreateTransferTx({
            networkType: 'testnet',
            senderPrivateKey: decryptedPrivateKey,
            recipientRawAddress: SendToAddress,
            message: `Payment via NFC Gate`,
            mosaics: [
                { 
                    mosaicId: BigInt(`0x${MosaicIDHex}`), 
                    amount: BigInt(Amount) * 1_000_000n 
                }
            ],
            deadlineHours: 2,
        });

        await SignAndAnnounce(tx, decryptedPrivateKey, facade, nodeUrl);

        console.log(`[Success] Gate Transfer. User:${fromUserID} -> ${sendtoUserID}, Amount:${Amount}, UID:${uid}`);
        
        // 【変更点】処理が成功しても pendingTransfers から delete しない (連続受付のため)
        
        // フロントエンドに「成功したよ」とリアルタイム通知
        if (io) {
            io.emit('payment:result', { reservationID, status: 'success', uid });
        }

        return res.status(200).send("送金完了");

    } catch (err) {
        console.error("[Transaction Error]", err);
        
        // エラー発生時はフロントエンドに失敗を通知
        if (io) {
            io.emit('payment:result', { reservationID, status: 'error', message: err.message });
        }
        
        // エラーになっても次が読み取れるようにクールダウンを解除する
        delete transfer.processedUids[uid];
        
        return res.status(500).send(err.message || "送金処理に失敗しました");
    }
});

export default router;