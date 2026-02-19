import express from 'express';
const router = express.Router();
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import VCM from '../Tools/VerifyCookieMiddleware.js';
import DBPerf from '../Tools/DBPerf.js';
import CreateMosaic from '../Tools/CreateMosaicTx.js';
import { decrypt } from '../Tools/AESControl.js';

// DB から取得した encryptedPrivateKey を復号
const decryptedPrivateKey = decrypt(passwordWithPepper, encryptedPrivateKey);

// mosaic 作成時に渡す
const { mosaicId, mosaicDefinitionTx } = CreateMosaicTx({
    senderPrivateKey: decryptedPrivateKey,
    networkType: 'testnet'
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cookieを使う
router.use(cookieParser());
dotenv.config({ path: path.join(__dirname, "..", ".env")});
const upload = multer({storage: multer.memoryStorage()});

// ===アイコン保存処理===
function saveIcon(file, folder) {
  const fileName = createFileName(file.originalname);
  const dir = path.join(__dirname, "..", "icons", folder);

  // フォルダが存在しない場合は作成
  fs.mkdirSync(dir, { recursive: true });

  // ファイルを保存
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, file.buffer);

  // DBに入れる用の「相対パス」
  return `/icons/${folder}/${fileName}`;
}

// ===被らないファイル名を作成===
function createFileName(originalName) {
  //拡張子取り出し(extname: .pngなど)
  const ext = path.extname(originalName);
  //拡張子を除いた部分を取り出し(basenme: filename)
  const base = path.basename(originalName, ext);
  //タイムスタンプを付与して被らないようにする
  return `${base}-${Date.now()}${ext}`;
}


// ===ルーム作成API===
router.post("/", VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), upload.fields([{ name: "RoomIcon", maxCount: 1 },{ name: "MosaicIcon", maxCount: 1 }]), async (req, res) => {
    try {
      const userID = req.auth.userId;
      if (!userID) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { RoomName, MosaicName } = req.body;

      if (!RoomName ||!MosaicName||!req.files?.RoomIcon ||!req.files?.MosaicIcon) {
        return res.status(400).json({ message: "Bad Request" });
      }

      //受け取ったMosaic情報をブロックチェーンに登録(発行)する処理をここに追加しても良い
      //秘密鍵
      const senderPrivateKey = await DBPerf("秘密鍵の抽出", "SELECT PrivateKey FROM Identify WHERE UserID = ?", [userID]);


      const RoomIconPath = await saveIcon(req.files.RoomIcon[0], "rooms");
      const MosaicIconPath = await saveIcon(req.files.MosaicIcon[0], "mosaics");

      await DBPerf(
        "INSERT Rooms",
        "INSERT INTO Rooms(UserID, RoomName) VALUES (?, ?)",[userID, RoomName]
      );

      await DBPerf(
        "INSERT RoomsDetail",
        "INSERT INTO RoomsDetails (RoomName, RoomIconPath, MosaicName) VALUES (?, ?, ?)",
        [RoomName, RoomIconPath, MosaicName]
      );

      const { mosaicId: MosaicID } = await CreateMosaic({
        networkType: 'testnet',
        senderPrivateKey: senderPrivateKey[0].PrivateKey,
        transferable: false,
        deadlineHours: 2
      });

      await DBPerf(
        "INSERT Mosaics",
        "INSERT INTO Mosaics (MosaicName, MosaicID, MosaicIconPath) VALUES (?, ?, ?)",
        [MosaicName, MosaicID, MosaicIconPath]
      );

      res.status(201).json({ message: "Room created successfully" });
    } catch (err) {
      console.error("CreateRoom-API Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

export default router;