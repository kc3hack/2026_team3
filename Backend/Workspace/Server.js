/**********************************************************************
 * Server.js
 *
 * アプリケーションのエントリーポイント
 * - Express初期化
 * - 環境変数読み込み
 * - Routesフォルダ自動読み込み
 * - サーバー起動
 *
 * ※ ESM（type: module）前提
 **********************************************************************/

// ==========================
// 標準モジュール
// ==========================

import express from 'express';      // Express本体
import path from 'path';           // パス操作
import fs from 'fs';               // ファイルシステム操作
import dotenv from 'dotenv';       // .env読み込み
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';  // __dirname再現用
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';


// ==========================
// __dirname 再生成（ESM用）
// ==========================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ==========================
// 環境変数読み込み
// ==========================

// CommonJSでは __dirname がそのまま使えたが
// ESMでは上記処理が必要
dotenv.config({
  path: path.resolve(__dirname, '.env')
});


// ==========================
// Express 初期化
// ==========================

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

globalThis.io = io;
app.set('io', io);


// ==========================
// ポート設定
// ==========================

// 環境変数にPORTがあればそれを使用
// なければ5000
const PORT = process.env.PORT || 5000;


// ==========================
// ミドルウェア設定
// ==========================

// JSONボディを扱えるようにする
app.use(express.json());

// Cookieを扱えるようにする
app.use(cookieParser());

// URLエンコード形式のフォーム対応
app.use(express.urlencoded({ extended: true }));

// publicフォルダを静的公開
app.use(express.static(path.join(__dirname, 'public')));

// 保存されたアイコンフォルダを静的配信
app.use('/icons', express.static(path.join(__dirname, 'icons')));



// ==========================
// Routes自動マウント処理
// ==========================

// Routesディレクトリの絶対パス
const routesDir = path.join(__dirname, 'Routes');

// ディレクトリ内のファイル一覧取得
fs.readdirSync(routesDir).forEach(async (file) => {

  // .jsファイルのみ対象
  if (!file.endsWith('.js')) return;

  // ファイル名から拡張子を除去
  const routeName = path.basename(file, '.js');

  // エンドポイントを自動生成
  // 例: Register.js → /Register
  const routePath = `/${routeName}`;

  // ESMでは require は使えないため dynamic import
  const routeModule = await import(
    path.join(routesDir, file)
  );

  // default export を取得
  const route = routeModule.default;

  // ルーティング登録
  app.use(routePath, route);

  console.log(`Route mounted: ${routePath}`);
});


// ==========================
// サーバー起動
// ==========================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
