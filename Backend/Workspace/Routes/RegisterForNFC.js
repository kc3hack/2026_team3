const express = require('express');
const app = express();

// JSONを受け取れるようにする
app.use(express.json());

// NFC登録のルート
app.post('/NFC', (req, res) => {
    const cardUid = req.body.uid;
    console.log(`カードを検知しました！ UID: ${cardUid}`);

    res.status(200).send({message: "Success"});
})