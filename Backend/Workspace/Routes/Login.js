// ==========================
// 標準モジュール読み込み
// ==========================
import express from 'express';               // Webサーバーフレームワーク
import path from 'path';                     // パス操作用
import { fileURLToPath } from 'url';         // ESMで __dirname を作るために必要

// ==========================
// 自作モジュール読み込み
// ==========================
import argon2 from 'argon2';                 // パスワードハッシュ検証用
import DBPerf from '../Tools/DBPerf.js';     // DBラッパー
import CreateCookie from '../Tools/CreateCookie.js'; // Cookie作成
import InverseVCM from '../Tools/InverseVCM.js';     // ログイン状態チェックミドルウェア

// ==========================
// __dirname 再生成 (ESM対応)
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================
// Express Router 初期化
// ==========================
const router = express.Router();

// JSONリクエストボディをパースできるようにする
router.use(express.json());

// ==========================
// 画面表示ルート
// ==========================

/**
 * GET /Login/
 * - ログイン済みの場合はアクセス拒否（InverseVCM）
 * - ログイン画面を返却
 */
router.get(
  '/',
  InverseVCM('LOGIN_TOKEN', process.env.LOGIN_SECRET),
  (req, res) => {
    console.log("/Login-API is running");
    res.sendFile(
      path.join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html")
    );
  }
);

// ==========================
// ログイン処理ルート
// ==========================

/**
 * POST /Login/Submit
 * - フロントエンドから送信された UserID と Password を受け取る
 * - DBからユーザー情報を取得
 * - ハッシュ検証後にクッキーを発行
 */
router.post("/Submit", async (req, res) => {

  // 0. 処理開始ログ
  console.log("/Login/Submit-API is running!");

  try {
    // 1. フロントエンド送信情報取得
    const { userId, password } = req.body;

    // 1a. 必須情報のチェック
    if (!userId || !password) {
      return res.status(400).json({
        message: "Bad Request: UserIDかPasswordが不足しています。"
      });
    }

    // 2. DB検索とサイドチャネル攻撃対策
    //    ユーザーが存在しない場合でも固定ダミーパスワードを使用
    const userInfo = await DBPerf(
      "Select From Identify To Login",
      "SELECT Address, Password FROM Identify WHERE UserID = ?;",
      [userId]
    );
    const hashToVerify = userInfo.length === 0 ? process.env.DUMMY_PASSWORD : userInfo[0].Password;

    // 3. パスワードハッシュ検証
    //    PEPPER を付加してセキュリティ強化
    const isVerified = await argon2.verify(hashToVerify, password + process.env.PEPPER);

    if (isVerified) {
      // 3a. 認証成功ログ
      console.log("LoginToken is verified!");

      // 4. Cookie発行
      CreateCookie({
        res,
        cookieName: 'LOGIN_TOKEN',
        payload: { userId, address: userInfo[0].Address },
        secretKey: process.env.LOGIN_SECRET,
        deadlineHours: 24, // 1日有効
        httpOnly: true,
        sameSite: 'strict'
      });

      // 5. リダイレクト
      res.redirect("/Home");

    } else {
      // 3b. 認証失敗ログ
      console.error("LoginToken is not verified!");
      return res.status(400).json({
        error: 'Bad Request: IDまたはPasswordが正しくありません。'
      });
    }

  } catch (err) {
    // 例外処理
    console.error("Login/Submit Error:", err);
    res.status(500).json({
      message: "Internal Server Error: サーバーエラーが発生しました。"
    });
  }
});

// ==========================
// Routerエクスポート
// ==========================
export default router;