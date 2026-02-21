// ==========================
// 標準モジュール読み込み
// ==========================
import express from 'express';               // Webサーバーフレームワーク
import path from 'path';                     // パス操作用
import { fileURLToPath } from 'url';         // ESMで __dirname を作るために必要

// ==========================
// 自作モジュール読み込み
// ==========================
import VCM from '../Tools/VCM.js';     // ログイン状態チェックミドルウェア

// ==========================
// __dirname 再生成 (ESM対応)
// ==========================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================
// Express Router 初期化
// ==========================
const router = express.Router();

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
  VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET),
  (req, res) => {
    console.log("/Home-API is running");
    res.sendFile(
      path.join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html")
    );
  }
);

// ==========================
// Routerエクスポート
// ==========================
export default router;