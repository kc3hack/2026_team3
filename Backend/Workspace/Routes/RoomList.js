import express from 'express';
import DBPerf from '../Tools/DBPerf.js';
import VCM from '../Tools/VerifyCookieMiddleware.js';
const router = express.Router();


// ========== 画面表示 ==========
router.get('/RoomList', VCM('LoginToken', process.env.LOGIN_SECRET), async (req, res) => {
    console.log("/RoomList-API is running");

    const userId = req.auth.userId;
    const [RoomList] = await DBPerf(
        "",
        "SELECT RoomName, RoomIconPath FROM RoomDetails WHERE RoomName IN (SELECT RoomName FROM Rooms WHERE UserID = ?)", [userId]
    );
    res.json({ RoomList });

}); 
export default router;