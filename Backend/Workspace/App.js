const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const fs = require('fs');

const routesDir = path.join(__dirname, 'Routes');

const app = express();

// ===== use =====
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// 静的ファイル（必要なら）
app.use(express.static(path.join(__dirname, '..', 'Frontend', 'dist')));

// ===== Routes =====
fs.readdirSync(routesDir).forEach((file) => {
    if (!file.endsWith('.js')) return;

    const routeName = path.basename(file, '.js');
    const routePath = `/${routeName}`;

    const route = require(path.join(routesDir, file));
    app.use(routePath, route);

    console.log(`Route mounted: ${routePath}`);
});

module.exports = app;