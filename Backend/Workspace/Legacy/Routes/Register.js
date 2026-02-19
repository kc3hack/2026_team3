const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const router = express.Router();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const argon2 = require('argon2');
const symbolSdk = require('symbol-sdk');
// Tools
const DBPerf = require('../Tools/DBPerf');
const InverseVCM = require('../Tools/InverseVCM');

// use系
router.use(cookieParser());
router.use(express.json());

// ネットワークタイプを指定（testnetの場合）
const networkType = 152; // TEST_NET

// ========== 画面表示 ==========
// /Register/へのアクセスでRegister画面表示
router.get('/', InverseVCM('LoginToken', process.env.LOGIN_SECRET), (req, res) => {
    console.log("/Register-API is running");
    res.sendFile(path.join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html"));
});

// ========== 情報送信 ==========
// /Register/SubmitへのアクセスでRegister情報を登録
router.post('/Submit', InverseVCM('LoginToken', process.env.LOGIN_SECRET), async (req, res) =>{
    console.log("Submit-API is running");
    try{
        // ========== 情報の登録準備 ==========
        //  情報の取得
        const { userId, password } = req.body;
        //必要な情報が揃っているか確認
        if( !userId || !password ){
            return res.status(400).json({message: "Bad Request: UserIDかPasswordが不足しています。"}); 
        }
        //ユーザーIDが被っていないか確認
        const exist = await DBPerf(
            "Duplicate Check For UserID", "SELECT * FROM Identify WHERE UserID = ?", [userId]
        );
        if(exist.length > 0){
            return res.status(409).json({message: "Conflict: このユーザーIDはすでに使われています"});
        }

        // ========== 秘密鍵保存 ==========
        // 秘密鍵生成
        const privateKey = symbolSdk.PrivateKey.random();
        console.log(`PrivateKey: ${privateKey}`);
        // アカウント生成
        const account = symbolSdk.Account.createFromPrivateKey(privateKey, networkType);
        console.log(`Account: ${account}`);
        // アドレス取得
        const address = account.address.plain();
        console.log(`Account: ${address}`);
        //Pepperを.envから取得
        const pepper = process.env.PEPPER;
        if(!pepper) {
            return res.status(500).json({message: "Internal Server Error: サーバー設定エラー"});
        }
        //Password+Papperを作成
        const passwordWithPepper = password + pepper;
        // 秘密鍵の暗号化
        const { encrypt } = require('../Tools/AESControl'); 
        const encryptedPrivateKey = encrypt(passwordWithPepper, privateKey);
        // Password+PapperをHash化
        const hashedPassword = await argon2.hash(passwordWithPepper, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,   // 推奨: 64MB
            timeCost: 5,           // 計算回数
            parallelism: 1         // 並列数
        });

        //UserIDとHash化したPassword + PepperとPrivateKeyをIdentifyテーブルに追加
        await DBPerf(
            "Insert Into Identify",
            "INSERT INTO Identify (UserID, Password, PrivateKey, Address) VALUES (?, ?, ?, ?)",
            [userId, hashedPassword, encryptedPrivateKey, address]
        );

        //登録成功 → Homeへリダイレクト
        res.status(200).json({ redirect: "/Home" });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }
});

module.exports = router;