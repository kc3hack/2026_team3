import express from 'express';
import DBPerf from '../Tools/DBPerf.js'; // ESMでは拡張子(.js)が必要です
import VCM from '../Tools/VCM.js'; // ESMでは拡張子(.js)が必要です

const router = express.Router();


// ========== 画面表示 ==========
router.get('/', VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), async (req, res) => {
    console.log("/RoomList-API is running");

    const userId = req.auth.userId;
    const RoomList = await DBPerf(
        "",
        "SELECT RoomName, RoomIconPath FROM RoomDetails WHERE RoomName IN (SELECT RoomName FROM Rooms WHERE UserID = ?)", [userId]
    );
    res.json({ RoomList });
});

export default router;