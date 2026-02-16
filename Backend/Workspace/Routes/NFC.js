const express = require('express');
const path = require('path');
const dotenv = require('dotenv').config();
const DBPref = require('../Tools/DBPref');
const argon2 = require('argon2');

const router = express.Router();

let latestcardUid = null; // 最新のカードUIDを保存する変数
let latestcardTime = null; // 最新のカード検知時間を保存する変数

// NFCカードの紐づけエンドポイント
router.post('/NFC/Submit', async(req, res) => {
    try{
        const {userID, password} = req.body

        if(!latestcardTime || Date.now() - latestcardTime > 10000){
            return res.status(400).send("カードをもう一度かざしてください");
        }

        // ユーザーIDとパスワードが送られてきているかの確認
        if(!userID || !password){
            console.log("ユーザーIDまたはパスワードが送られてきていません！");
            return res.status(400).send({ message: 'User ID and password are required' });
        }

        // カードUIDが送られてきているかの確認
        if(!latestcardUid){
            console.log("カードのUIDが送られてきていません！");
            return res.status(400).send({ message: 'Card UID is required' });
        }

        // カードが既に紐づけられていないかの確認
        const exitUid = await DBPref("カードが既に紐づけられていないかの確認","SELECT * FROM NFC WHERE UID = ?",[latestcardUid])
        if(exitUid.length != 0){
            console.log("このカードは既に紐づけられています！");
            return res.status(400).send({ message: 'This card is already linked to an account' });
        }

        // ユーザーIDが存在するかの確認とパスワードの照合
        const userInfor = await DBPref("存在するアカウントかの確認","SELECT userID, password FROM users WHERE userID = ?",[userID])
        // ユーザーIDが存在しない場合はダミーパスワードと照合して常に失敗させる（セキュリティ対策）
        const comparePassword = userInfor.length == 0 ? process.env.DUMMY_PASSWORD : userInfor[0].password;
        if (await argon2.verify(comparePassword, password + process.env.PEPPER)){
            // アカウントとNFCカードの紐づけ
            await DBPref("アカウントとNFCカードの紐づけ","INSERT INTO NFC (UID, userID) VALUES (?, ?)",[latestcardUid, userID])
            console.log(`カードUID: ${latestcardUid} とユーザーID: ${userID} を紐づけました！`);
            latestcardUid = null;
            latestcardTime = null;

            res.status(200).send({ message: 'NFC card linked successfully' });
        }
        else{
            console.log("パスワードが間違っています！");
            return res.status(401).send({ message: 'Invalid password' });
        }
    }catch(err){
        console.error("NFCカードの紐づけに失敗しました！", err);
        return res.status(500).send({ message: 'Failed to link NFC card' });
    }
});

// PythonからカードUIDを受け取るエンドポイント
router.post('/NFC', (req, res) => {
    latestcardUid = req.body.uid; // Pythonから送られてきたUID
    latestcardTime = Date.now(); // カードが検知された時間を保存
    console.log(`カードを検知しました！ UID: ${latestcardUid}`);

    // Python側に「無事に受け取ったよ」と返事をする
    res.status(200).send({ message: 'Success' });
});

