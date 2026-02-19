FROM node:20-alpine

WORKDIR /app

# ① 依存ファイルだけコピー
COPY Backend/package*.json ./

# ② 依存インストール
RUN npm install

# ③ バックエンド本体コピー
COPY Backend ./

# ④ フロントdistをサーバが参照する場所へコピー
# Server.js が repo ルート直下の Frontend/dist を参照するため、/app/Frontend/dist に配置する
COPY Frontend/dist ./Frontend/dist

EXPOSE 5000

CMD ["node", "Workspace/Server.js"]