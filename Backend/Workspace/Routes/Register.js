// Register.js
import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import argon2 from 'argon2';
import DBPerf from '../Tools/DBPerf.js';
import { encrypt } from '../Tools/AESControl.js';
import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();

// ES Module で __dirname を使えるようにする
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 環境変数読み込み
dotenv.config({ path: join(__dirname, '..', '.env') });

// use系
router.use(cookieParser());
router.use(express.json());

// ========== 画面表示 ==========
// /Register/へのアクセスでRegister画面表示
router.get('/', (req, res) => {
    console.log("/Register-API is running");
    res.sendFile(join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html"));
});

// ========== 情報送信 ==========
// /Register/SubmitへのアクセスでRegister情報を登録
router.post('/Submit', async (req, res) => {
    console.log("Submit-API is running");
    try {
        // 情報の取得
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ message: "Bad Request: UserIDかPasswordが不足しています。" });
        }

        // ユーザーIDが被っていないか確認
        const exist = await DBPerf(
            "Duplicate Check For UserID",
            "SELECT * FROM Identify WHERE UserID = ?",
            [userId]
        );
        if (exist.length > 0) {
            return res.status(409).json({ message: "Conflict: このユーザーIDはすでに使われています" });
        }

        // ========== 秘密鍵保存 ==========
        const privateKeyObject = PrivateKey.random();
        const privateKey = privateKeyObject.toString();
        const facade = new SymbolFacade('testnet');
        const account = facade.createAccount(privateKeyObject);
        const address = account.address.toString();

        // Pepper を .env から取得
        const pepper = process.env.PEPPER;
        if (!pepper) {
            return res.status(500).json({ message: "Internal Server Error: サーバー設定エラー" });
        }

        const passwordWithPepper = password + pepper;

        // 秘密鍵の暗号化
        const encryptedPrivateKey = encrypt(passwordWithPepper, privateKey);

        // パスワード + Pepper を Hash 化
        const hashedPassword = await argon2.hash(passwordWithPepper, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 推奨: 64MB
            timeCost: 5,          // 計算回数
            parallelism: 1        // 並列数
        });

        // DB に登録
        await DBPerf(
            "Insert Into Identify",
            "INSERT INTO Identify (UserID, Password, PrivateKey, Address) VALUES (?, ?, ?, ?)",
            [userId, hashedPassword, encryptedPrivateKey, address]
        );

        res.status(200).json({ redirect: "/Home" });
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }
});

export default router;
