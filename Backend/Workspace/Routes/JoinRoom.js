import express from 'express';
import DBPerf from '../Tools/DBPerf.js';
import VCM from '../Tools/VCM.js';

const router = express.Router();

router.use(express.json());

router.post('/' , VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), async (req, res) => {
    console.log('/JoinRoom-API is running');

    try {
        const userId = req.auth.userId;
        const inputRoomName = req.body?.roomName;
        const roomName = typeof inputRoomName === 'string' ? inputRoomName.trim() : '';

        if (!roomName) {
            return res.status(400).json({ message: 'Bad Request: roomNameが不足しています' });
        }

        const roomExists = await DBPerf(
            'Check Room Exists',
            'SELECT RoomName FROM RoomDetails WHERE RoomName = ?',
            [roomName]
        );

        if (roomExists.length === 0) {
            return res.status(404).json({ message: 'Not Found: 指定されたルームは存在しません' });
        }

        const alreadyJoined = await DBPerf(
            'Check Already Joined',
            'SELECT 1 FROM Rooms WHERE UserID = ? AND RoomName = ?',
            [userId, roomName]
        );

        if (alreadyJoined.length > 0) {
            return res.status(409).json({ message: 'Conflict: 既にこのルームに所属しています' });
        }

        await DBPerf(
            'Insert Room Member',
            'INSERT INTO Rooms (UserID, RoomName) VALUES (?, ?)',
            [userId, roomName]
        );

        return res.status(201).json({ message: 'ルーム参加が完了しました' });
    } catch (err) {
        console.error('JoinRoom-API Error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

export default router;
