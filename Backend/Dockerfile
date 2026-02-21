FROM node:20-alpine

WORKDIR /app

# ① 依存ファイルだけコピー
COPY Backend/package*.json ./

# ② 依存インストール
RUN npm install

# ③ バックエンド本体コピー
COPY Backend ./

# ④ フロントdistコピー
COPY Frontend/dist ./Workspace/public

EXPOSE 5000

CMD ["node", "Workspace/Server.js"]
