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

app.post('/scan', (req, res) => {
    const cardUid = req.body.uid; // Pythonから送られてきたUID
    console.log(`カードを検知しました！ UID: ${cardUid}`);

    // Python側に「無事に受け取ったよ」と返事をする
    res.status(200).send({ message: 'Success' });
});

// サーバ起動
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
