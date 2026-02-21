import express from 'express';
import path from 'path'; // ※現在のコードでは使用されていないようですが残しています
import dotenv from 'dotenv';
import DBPerf from '../Tools/DBPerf.js'; // ESMでは自作モジュールに拡張子(.js)が必須です
import argon2 from 'argon2';

dotenv.config();

const router = express.Router();

let latestcardUid = null; // 最新のカードUIDを保存する変数
let latestcardEncryptedPassword = null; // 最新のカードの暗号化されたパスワードを保存する変数
let latestcardTime = null; // 最新のカード検知時間を保存する変数

// NFCカードの紐づけエンドポイント
router.post('/Submit', async (req, res) => {
    // 0. 処理開始ログ
    console.log("/NFC/Submit-API is running!");
    try {
        const { userID, userId, password } = req.body;
        const normalizedUserID = userID ?? userId;
        // 【修正】後で true を代入するため、const ではなく let に変更しました
        let nfcRead = false; 

        if (!latestcardTime || Date.now() - latestcardTime > 10000) {
            return res.status(400).send("カードをもう一度かざしてください");
        }

        // ユーザーIDとパスワードが送られてきているかの確認
        if (!normalizedUserID || !password) {
            console.log("ユーザーIDまたはパスワードが送られてきていません！");
            return res.status(400).send({ message: 'User ID and password are required' });
        }

        // カードUIDが送られてきているかの確認
        if (!latestcardUid) {
            console.log("カードのUIDが送られてきていません！");
            return res.status(400).send({ message: 'Card UID is required' });
        }

        // カードが既に紐づけられていないかの確認
        const exitUid = await DBPerf("カードが既に紐づけられていないかの確認", "SELECT * FROM NFC WHERE UID = ?", [latestcardUid]);
        if (exitUid.length != 0) {
            console.log("このカードは既に紐づけられています！");
            return res.status(400).send({ message: 'This card is already linked to an account' });
        }

        // ユーザーIDが存在するかの確認とパスワードの照合
        const userInfor = await DBPerf("存在するアカウントかの確認", "SELECT UserID, Password FROM Identify WHERE UserID = ?", [normalizedUserID]);
        
        // ユーザーIDが存在しない場合はダミーパスワードと照合して常に失敗させる（セキュリティ対策）
        const comparePassword = userInfor.length == 0 ? process.env.DUMMY_PASSWORD : userInfor[0].Password;
        
        if (await argon2.verify(comparePassword, password + process.env.PEPPER)) {
            // アカウントとNFCカードの紐づけ
            await DBPerf("アカウントとNFCカードの紐づけ", "INSERT INTO NFC (UID, UserID) VALUES (?, ?)", [latestcardUid, normalizedUserID]);
            console.log(`カードUID: ${latestcardUid} とユーザーID: ${normalizedUserID} を紐づけました！`);
            latestcardUid = null;
            latestcardTime = null;
            nfcRead = true;
            res.json({ nfcRead: nfcRead });
        } else {
            console.log("パスワードが間違っています！");
            return res.status(401).send({ message: 'Invalid password' });
        }
    } catch (err) {
        console.error("NFCカードの紐づけに失敗しました！", err);
        return res.status(500).send({ message: 'Failed to link NFC card' });
    }
});

// PythonからカードUIDを受け取るエンドポイント
router.post('/', (req, res) => {
    latestcardUid = req.body.uid; // Pythonから送られてきたUID
    latestcardEncryptedPassword = req.body.encrypted_password; // Pythonから送られてきた暗号化されたパスワードオブジェクト
    latestcardTime = Date.now(); // カードが検知された時間を保存
    console.log(`カードを検知しました！ UID: ${latestcardUid}`);
    console.log(`暗号化されたパスワードデータ: ${JSON.stringify(latestcardEncryptedPassword)}`);
    globalThis.io?.emit('nfc:detected', {
        uid: latestcardUid,
        encrypted_password: latestcardEncryptedPassword,
        at: latestcardTime
    });

    // Python側に「無事に受け取ったよ」と返事をする
    res.status(200).send({ message: 'Success' });
});

export default router;