import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });
const routesDir = path.join(__dirname, 'Routes');

const app = express();

// ========== 初期設定 ==========
const PORT = process.env.PORT || 5000;

// ========== use系 ==========
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
// コンテナ内では /app/Frontend/dist に配置しているため1階層上を参照する
app.use(express.static(path.join(__dirname, '..', 'Frontend', 'dist')));

// ========== Routes ==========
// fs.readdirSync(ディレクトリパス)でそのディレクトリ内のファイル名を配列で取得
for (const file of fs.readdirSync(routesDir)) {
    // js ファイルだけ対象
    if (!file.endsWith('.js')) continue;

    // APIのエンドポイントをファイル名から作成
    const routeName = path.basename(file, '.js');
    const routePath = `/${routeName}`;

    // Routing処理
    const routeFileUrl = pathToFileURL(path.join(routesDir, file)).href;
    const routeModule = await import(routeFileUrl);
    app.use(routePath, routeModule.default);

    // コンソール表示
    console.log(`Route mounted: ${routePath}`);
}

// ========== listen ==========
// SPA fallback: 未処理の GET リクエストは index.html を返す
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Frontend', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => { console.log(`Server running at https://localhost:${PORT}`)} );