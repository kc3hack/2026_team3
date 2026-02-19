const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const DBPerf = require('../Tools/DBPerf');
const VCM = require('../Tools/VerifyCookieMiddleware');
const LeftToken = require('../Tools/LeftToken');
const decrypt = require('../Tools/AESControl');
const CreateTransferTx = require('../Tools/CreateTransferTx');
const SignAndAnnounce = require('../Tools/SignAndAnnounce');

// 送金処理
router.post('/SendToken', VCM('LoginToken', process.env.LOGIN_SECRET), async(req, res) => {

    //送金先のIDと送金額をリクエストボディから抽出
    const { sendtoUserID, Amount } = req.body;
    //cookieから送金元のユーザーIDを抽出
    const fromUserID = req.auth.userID;

    //送金先のユーザーIDと送金額がリクエストボディに存在するかの確認
    if (!sendtoUserID || !Amount) {
        console.log("送金先のユーザーIDまたは送金額が不足しています！");
        return res.status(400).send({ message: 'Missing required fields' });
    }

    // 送金元のユーザーIDと送金先のユーザーIDが存在するかの確認
    const fromUserInfor = await DBPerf("送金元ユーザーの存在確認", "SELECT UserID, Password, PrivateKey FROM IdentifyTable WHERE UserID = ?", [fromUserID]);
    const toUserInfor = await DBPerf("送金先ユーザーの存在確認", "SELECT UserID, Address FROM IdentifyTable WHERE UserID = ?", [sendtoUserID]);
    if (fromUserInfor.length === 0) {
        console.log("送金元のユーザーIDが存在しません！");
        return res.status(400).send({ message: 'Invalid user ID' });
    }
    if (toUserInfor.length === 0) {
        console.log("送金先のユーザーIDが存在しません！");
        return res.status(400).send({ message: 'Invalid user ID' });
    }

    // 送金処理の実行
    const SendToAddress = toUserInfor[0].Address;
    // 送金元のユーザーIDの秘密鍵とパスワードをデータベースから抽出
    const privateKey = fromUserInfor[0].PrivateKey;
    const password = fromUserInfor[0].Password;

    //MosaicIDの取得
    const roomName = await DBPerf("送金するルームの名前の抽出", "SELECT RoomName FROM Rooms WHERE userID = ?", [fromUserID]);
    const mosaicName = await DBPerf("MosaicIDの抽出", "SELECT MosaicName FROM RoomDetails WHERE RoomName = ?", [roomName[0].RoomName]);
    const mosaicID = await DBPerf("MosaicIDの抽出", "SELECT MosaicID FROM Mosaics WHERE MosaicName = ?", [mosaicName[0].MosaicName]);
    const MosaicID = mosaicID[0].MosaicID;

    // パスワードを照合して認証
    const decryptedPrivateKey = decrypt(password , privateKey);
    
    const {tx, keyPair, facade} = CreateTransferTx({
        networkType: 'testnet',
        senderPrivateKey: decryptedPrivateKey,
        recipientRawAddress: SendToAddress,
        message: `Send ${Amount} tokens to ${sendtoUserID}`,
        mosaics: [
            { 
                mosaicId: MosaicID, 
                amount: BigInt(Amount) * 1_000_000n }
        ],
        deadlineHours: 2,
    })
    
    // 署名とアナウンス
    // NODEの定義
    const NODE_URL = 'https://sym-test-01.opening-line.jp:3001';
    // 実際に署名とアナウンスを行う
    await SignAndAnnounce(tx, keyPair, facade, NODE_URL);
    // Shutdown Log
    console.log(`[${logOwner}] Shutdown!`);

    return res.status(200).json({ message: "OK: Send Successful"});
});

router.get('/LeftToken', VCM('LoginToken', process.env.LOGIN_SECRET), async(req, res) => {
    const fromUserID = req.auth.userID;
    const userInfor = await DBPerf("送金元ユーザーの存在確認", "SELECT Address FROM IdentifyTable WHERE userID = ?", [fromUserID]);
    const address = userInfor[0].Address;
    const NODE_URL = 'https://sym-test-01.opening-line.jp:3001';
    try{
        const leftToken = await LeftToken(address, NODE_URL);
        res.status(200).send(leftToken);
    }catch(err){
        console.error("Error in LeftToken:", err);
        res.status(500).send({ message: "Error fetching left token" });
    }
});

// router.get('/sendRoomDetail', async(req, res) => {
//     const {roomID} = req.body;
//     const roomDetail = await DBPerf("ルームの詳細(ルーム名、ルームアイコン)の抽出", "SELECT * FROM RoomTable WHERE roomID = ?", [roomID]);
//     res.status(200).send(roomDetail);
// });

module.exports = router;


/*
1. cookieからuserIDを抽出
2. 送金先のユーザーIDと送金額をリクエストボディから抽出
3. 送金元のユーザーIDと送金先のユーザーIDが存在するかの確認
4. 送金元のユーザーIDのパスワードをデータベースから抽出
5. パスワードを照合して認証
6. 認証成功なら送金処理を実行（例: データベースの更新など）
*/