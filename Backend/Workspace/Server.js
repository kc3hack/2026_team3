const express = require('express');
const path = require('path');
// 絶対パス指定
const dotenv = require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const cookieParser = require('cookie-parser');
// Routing自動化
const fs = require('fs');
const routesDir = path.join(__dirname, 'Routes');

const app = express();

// ========== 初期設定 ==========
PORT = process.env.PORT || 5000;

// ========== use系 ==========
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
// コンテナ内では /app/Frontend/dist に配置しているため1階層上を参照する
app.use(express.static(path.join(__dirname, '..', 'Frontend', 'dist')));

// ========== Routes ==========
// fs.readdirSync(ディレクトリパス)でそのディレクトリ内のファイル名を配列で取得
fs.readdirSync(routesDir).forEach((file) => {
    // js ファイルだけ対象
    if (!file.endsWith('.js')) return;

    // APIのエンドポイントをファイル名から作成
    const routeName = path.basename(file, '.js');
    const routePath = `/${routeName}`;

    // Routing処理
    const route = require(path.join(routesDir, file));
    app.use(routePath, route);

    // コンソール表示
    console.log(`Route mounted: ${routePath}`);
});

// ========== listen ==========
// SPA fallback: 未処理の GET リクエストは index.html を返す
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Frontend', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => { console.log(`Server running at https://localhost:${PORT}`)} );