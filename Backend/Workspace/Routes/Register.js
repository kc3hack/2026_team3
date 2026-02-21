// ==========================
// 標準・外部モジュールの読み込み
// ==========================

import express from 'express';              // Expressフレームワーク
import path from 'path';                    // パス操作用
import dotenv from 'dotenv';                // .env読み込み
import cookieParser from 'cookie-parser';   // Cookie解析
import argon2 from 'argon2';                // パスワードハッシュ化
import { fileURLToPath } from 'url';        // ESMで__dirnameを再現するために必要

// symbol-sdk v3
import { SymbolFacade } from 'symbol-sdk/symbol';
import { PrivateKey } from 'symbol-sdk';

// ==========================
// 自作ツールの読み込み
// ※ ESMでは必ず拡張子 .js を付ける
// ==========================

import DBPerf from '../Tools/DBPerf.js';          // DB実行ラッパー
import InverseVCM from '../Tools/InverseVCM.js';  // 未ログイン専用ミドルウェア
import { encrypt } from '../Tools/AESControl.js'; // AES暗号化関数


// ==========================
// 環境変数の読み込み
// ==========================

dotenv.config();


// ==========================
// ESMでは__dirnameが存在しないため再生成
// ==========================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ==========================
// Express Router初期化
// ==========================

const router = express.Router();


// ==========================
// ミドルウェア設定
// ==========================

// Cookieをreq.cookiesで扱えるようにする
router.use(cookieParser());

// JSONボディを解析可能にする
router.use(express.json());

// =====================================================================
// 画面表示API
// =====================================================================

router.get(
  '/',
  // 既にログインしている場合はアクセス拒否するミドルウェア
  InverseVCM('LOGIN_TOKEN', process.env.LOGIN_SECRET),

  (req, res) => {
    console.log("/Register-API is running");

    // フロントエンドのビルド済みHTMLを返す
    res.sendFile(
      path.join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html")
    );
  }
);


// =====================================================================
// ユーザー登録処理
// =====================================================================

router.post(
  '/Submit',

  // ログイン済みなら拒否
  InverseVCM('LOGIN_TOKEN', process.env.LOGIN_SECRET),

  async (req, res) => {

    console.log("Submit-API is running");

    try {

      // ==========================
      // 入力値取得
      // ==========================

      const { userId, password } = req.body;

      // 必須項目チェック
      if (!userId || !password) {
        return res.status(400).json({
          message: "Bad Request: UserIDかPasswordが不足しています。"
        });
      }

      // ==========================
      // ユーザー重複チェック
      // ==========================

      const exist = await DBPerf(
        "Duplicate Check For UserID",
        "SELECT * FROM Identify WHERE UserID = ?",
        [userId]
      );

      if (exist.length > 0) {
        return res.status(409).json({
          message: "Conflict: このユーザーIDはすでに使われています"
        });
      }


      // =====================================================
      // 1. Symbolブロックチェーン用アカウント生成
      // =====================================================
      const facade = new SymbolFacade('testnet');

      const privateKey = PrivateKey.random();
      const account    = facade.createAccount(privateKey);
      const address    = account.address.toString();
      const privateKeyString = privateKey.toString();

      console.log("秘密鍵:", privateKeyString);
      console.log("アドレス:", address);

      // =====================================================
      // 2. パスワード + Pepper 処理
      // =====================================================

      const pepper = process.env.PEPPER;

      if (!pepper) {
        return res.status(500).json({
          message: "Internal Server Error: サーバー設定エラー"
        });
      }

      // パスワード + Pepper
      // PepperはDBに保存しないサーバー専用秘密値
      const passwordWithPepper = password + pepper;
      console.log("パスワードとペッパーを結合した文字列:", passwordWithPepper);

      const encryptPassword = encrypt(process.env.PEPPER, password);
      console.log("暗号化されたパスワード:", encryptPassword);


      // =====================================================
      // 3. 秘密鍵をAES暗号化
      // =====================================================

      // ユーザーのパスワードから復号可能にする設計
      const encryptedPrivateKey =
        JSON.stringify(
        encrypt(passwordWithPepper, privateKeyString)
    );
    console.log("暗号化された秘密鍵オブジェクト:", privateKeyString);
    console.log("暗号化された秘密鍵:", encryptedPrivateKey);

      // =====================================================
      // 4. パスワードをArgon2でハッシュ化
      // =====================================================

      const hashedPassword = await argon2.hash(passwordWithPepper, {
        type: argon2.argon2id,  // 現在推奨方式
        memoryCost: 2 ** 16,   // 64MB
        timeCost: 5,           // 計算回数
        parallelism: 1
      });

      // 4. Cookie発行
      CreateCookie({
        res,
        cookieName: 'LOGIN_TOKEN',
        payload: { userId, address: address },
        secretKey: process.env.LOGIN_SECRET,
        deadlineHours: 24, // 1日有効
        httpOnly: true,
        sameSite: 'strict'
      });


      // =====================================================
      // 5. DB保存
      // =====================================================

      await DBPerf(
        "Insert Into Identify",
        "INSERT INTO Identify (UserID, Password, PrivateKey, Address) VALUES (?, ?, ?, ?)",
        [userId, hashedPassword, encryptedPrivateKey, address]
      );


      // =====================================================
      // 登録成功
      // =====================================================

      res.status(200).json({ redirect: "/Home" });

    } catch (err) {

      console.error("Register Error:", err);

      res.status(500).json({
        message: "Internal Server Error: サーバーエラーが発生しました。"
      });
    }
  }
);


// ==========================
// Routerエクスポート
// ==========================

export default router;
