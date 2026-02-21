import express from 'express';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { randomUUID } from "crypto";

// 注意1: Node.jsのESMでは、独自ファイルのimportに拡張子（.js）が必須です
import VCM from '../Tools/VCM.js';
import DBPerf from '../Tools/DBPerf.js';
import { decrypt } from '../Tools/AESControl.js';
import { CreateMosaicTx } from '../Tools/CreateMosaicTx.js';
import { CreateSupplyTx } from '../Tools/SupplyMosaic.js';
import SignAndAnnounce from '../Tools/SignAndAnnounce.js';

// 注意2: ESMでは __dirname がデフォルトで存在しないため、自作する必要があります
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// cookieを使う
router.use(cookieParser());
dotenv.config({ path: path.join(__dirname, "..", ".env")});
const upload = multer({ storage: multer.memoryStorage() });

// ===アイコン保存処理===
function saveIcon(file, folder) {
  const fileName = createFileName(file.originalname);
  const dir = path.join(__dirname, "..", "icons", folder);

  // フォルダが存在しない場合は作成
  fs.mkdirSync(dir, { recursive: true });

  // ファイルを保存
  const fullPath = path.join(dir, fileName);
  fs.writeFileSync(fullPath, file.buffer);

  console.log(`Icon saved to ${fullPath}`);

  // DBに入れる用の「相対パス」
  return `/icons/${folder}/${fileName}`;
}

// ===被らないファイル名を作成===
function createFileName(originalName) {
  //拡張子取り出し(extname: .pngなど)
  const ext = path.extname(originalName);
  const Refilename = `${randomUUID()}${ext}`;
  console.log(`Generated unique filename: ${Refilename}`);
  //タイムスタンプを付与して被らないようにする
  return Refilename;
}

// ===ルーム作成API===
router.post("/", VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), upload.fields([{ name: "RoomIcon", maxCount: 1 },{ name: "MosaicIcon", maxCount: 1 }]), async (req, res) => {
    try {
      const userID = req.auth.userId;
    const { RoomName, MosaicName, Password, password } = req.body;
    const inputPassword = Password ?? password;
      console.log("Received CreateRoom request:", { userID, RoomName, MosaicName, Password });
    if (!userID || !RoomName || !MosaicName || !inputPassword) {
          console.log("Missing required fields in CreateRoom request");
          return res.status(400).json({ message: "UserID, RoomName, MosaicName, and Password are required" });
      }


      if (!RoomName || !MosaicName || !req.files?.RoomIcon || !req.files?.MosaicIcon) {
        return res.status(400).json({ message: "Bad Request" });
      }

      const OwnerInfor = await DBPerf(
        "Get Encrypted Private Key","SELECT PrivateKey FROM Identify WHERE userID = ?",[userID]
      );
      const encryptedPrivateKeyObj = JSON.parse(OwnerInfor[0].PrivateKey);
      const privateKey = decrypt(inputPassword + process.env.PEPPER, encryptedPrivateKeyObj);

      // ===== Mosaic定義トランザクション作成 =====
      const { mosaicId, mosaicDefinitionTx, keyPair, facade } = CreateMosaicTx({
        networkType: 'testnet',
        senderPrivateKey: privateKey,
        transferable: false,
        deadlineHours: 24
      });

      // ===== DBに保存する前に、モザイクをブロックチェーンに登録 =====
      try {
        console.log("[CreateRoom] Announcing Mosaic Definition Transaction...");
        const definitionResult = await SignAndAnnounce(
          mosaicDefinitionTx,
          privateKey,
          facade,
          'https://sym-test-01.opening-line.jp:3001',
          {
            waitForConfirmation: true,
            confirmationTimeoutMs: 180000,
            pollIntervalMs: 2000
          }
        );
        console.log("[CreateRoom] Mosaic Definition TX Hash:", definitionResult.hash);
        console.log("[CreateRoom] Mosaic Definition TX Announced Successfully!");

        // ===== 供給量設定トランザクション作成・送信 =====
        console.log("[CreateRoom] Creating Supply Change Transaction...");
        const { supplyTx, keyPair: supplyKeyPair, facade: supplyFacade } = CreateSupplyTx({
          networkType: 'testnet',
          senderPrivateKey: privateKey,
          mosaicId: mosaicId,
          supply: 1_000_000n,  // 初期供給量：100万（divisibility=0なので実際の量）
          deadlineHours: 24
        });

        console.log("[CreateRoom] Announcing Supply Change Transaction...");
        const supplyResult = await SignAndAnnounce(
          supplyTx,
          privateKey,
          supplyFacade,
          'https://sym-test-01.opening-line.jp:3001',
          {
            waitForConfirmation: true,
            confirmationTimeoutMs: 180000,
            pollIntervalMs: 2000
          }
        );
        console.log("[CreateRoom] Supply Change TX Hash:", supplyResult.hash);
        console.log("[CreateRoom] Supply Change TX Announced Successfully!");

      } catch (txErr) {
        console.error("[CreateRoom] Blockchain Transaction Error:", txErr);
        return res.status(500).json({ 
          message: "Failed to register mosaic on blockchain",
          error: txErr.message 
        });
      }

      const RoomIconPath = await saveIcon(req.files.RoomIcon[0], "rooms");
      console.log("RoomIcon saved at:", RoomIconPath);
      const MosaicIconPath = await saveIcon(req.files.MosaicIcon[0], "tokens");
      console.log("MosaicIcon saved at:", MosaicIconPath);

      await DBPerf(
        "INSERT Mosaic",
        "INSERT INTO Mosaic (MosaicID, MosaicName) VALUES (?, ?)",
        [mosaicId, MosaicName ]
      );

      await DBPerf(
        "INSERT RoomDetails",
        "INSERT INTO RoomDetails(RoomName, RoomIconPath, MosaicName) VALUES (?, ?, ?)",
        [RoomName, RoomIconPath, MosaicName]
      );

      await DBPerf(
        "INSERT Rooms",
        "INSERT INTO Rooms(UserID, RoomName) VALUES (?, ?)",[userID, RoomName]
      );

      res.status(201).json({ message: "Room created successfully" });
    } catch (err) {
      console.error("CreateRoom-API Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

// モジュールのエクスポート
export default router;