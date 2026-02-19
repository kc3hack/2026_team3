const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const VCM = require('../Tools/VerifyCookieMiddleware');
const DBPerf = require('../Tools/DBPerf');

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
router.post("/", VCM('LoginToken', process.env.LOGIN_SECRET), upload.fields([{ name: "RoomIcon", maxCount: 1 },{ name: "TokenIcon", maxCount: 1 }]), async (req, res) => {
    try {
      const userID = req.auth.userId;
      const { RoomName, MosaicName } = req.body;

      if (!RoomName ||!MosaicName||!req.files?.RoomIcon ||!req.files?.MosaicIcon) {
        return res.status(400).json({ message: "Bad Request" });
      }

      //受け取ったルームIDをMosaic名としてブロックチェーンに登録する処理をここに追加しても良い
      //受け取ったMosaic情報をブロックチェーンに登録(発行)する処理をここに追加しても良い

      const RoomIconPath = await saveIcon(req.files.RoomIcon[0], "rooms");
      const MosaicIconPath = await saveIcon(req.files.TokenIcon[0], "tokens");

      await DBPerf(
        "INSERT Rooms",
        "INSERT INTO Rooms(UserID, RoomName, isAdmin) VALUES (?, ?, ?)",[userID, RoomName, 1]
      );

      await DBPerf(
        "INSERT RoomsDetail",
        "INSERT INTO RoomsDetail (RoomName, RoomIconPath, MosaicName, MosaicIconPath) VALUES (?, ?, ?, ?)",
        [RoomName, RoomIconPath, MosaicName, MosaicIconPath]
      );

      res.status(201).json({ message: "Room created successfully" });
    } catch (err) {
      console.error("CreateRoom-API Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

module.exports = router;