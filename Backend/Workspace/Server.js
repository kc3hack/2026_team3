const express = require("express");
const app = express();

// ポート番号
const PORT = 3000;

// JSONを受け取れるようにする
app.use(express.json());

// ルート
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// サーバ起動
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
