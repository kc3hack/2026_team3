const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const router = express.Router();
const argon2 = require('argon2');
const DBPerf = require('../Tools/DBPerf');
const CreateCookie = require('../Tools/CreateCookie');

// use系
dotenv.config({ path: path.join(__dirname, "..", ".env") });
router.use(express.json());

// ========== ブロックチェーンの準備 ==========
//const symbolSdk = require('symbol-sdk');
const InverseVCM = require('../Tools/InverseVCM');
//const facade = new symbolSdk.facade.SymbolFacade('testnet');

// ========== 画面表示 ==========
// /Login/へのアクセスでLogin画面表示
router.get('/', InverseVCM('LOGIN_TOKEN', process.env.LOGIN_SECRET) ,(req, res) => {
    console.log("/Login-API is running");
    // Frontend はビルド後に /app/Frontend/dist に配置しているため dist の index.html を返す
    res.sendFile(path.join(__dirname, "..", "..", "Frontend", "dist", "index.html"));
});


router.post("/Submit", async (req, res) => {
    // 0. Startup Log
    console.log("/Login/Submit-API is running!");

    // 1. Login情報を取得する
    const { userId, password } = req.body;
    //必要な情報が揃っているか確認
    if( !userId || !password ){
        return res.status(400).json({message: "Bad Request: UserIDかPasswordが不足しています。"}); 
    }

    // 2. DB検索とサイドチャネル攻撃の対策
    const userInfo = await DBPerf("Select From Identify To Login", "SELECT Address, Password FROM Identify WHERE UserID = ?;", [userId]);
    const comparePassword = userInfo.length == 0 ? process.env.DUMMY_PASSWORD : userInfo[0].Password;
    
    // 3. Hashの検証
    if (await argon2.verify(comparePassword, password + process.env.PEPPER)) {
        // Verify Success Log
        console.log("LoginToken is verified!");

        CreateCookie({
            res,
            cookieName: 'LOGIN_TOKEN',
            payload: { userId: userId, address: userInfo[0].Address },
            secretKey: process.env.LOGIN_SECRET,
            deadlineHours: 24, // 1日
            httpOnly: true,
            sameSite: 'strict'
        });

        // リダイレクト
        res.redirect("/Home");
        
    }else{
        // Verify Error Log
        console.error("LoginToken is not verified!");
        return res.status(400).json({ error: 'Bad Request: ID or Password is failed.' });
    }
})

module.exports = router;
