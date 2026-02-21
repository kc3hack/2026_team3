import "./NFC.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useRef } from "react";
import { io, Socket } from "socket.io-client";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";
import icon from "../../Components/Elements/icon.png";
import NFCimage from "../../Components/Elements/NFCimage.png";

function NFC() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  async function HandleNFC() {
    try {
      const res = await fetch('/NFC/Submit', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error("登録に失敗しました");
        console.log("Faild: SendToken", data);
        return false;
      } else {
        toast.success("NFCを登録しました");
        console.log("Success: SendToken");
        return true;
      }
    } catch (err) {
      toast.error('通信エラーが発生しました');
      console.log("Faild: Communication");
      return false;
    }
  }

  useEffect(() => { //webソケット作成
    const socket = io("/", {
      transports: ["websocket"],
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!showModal || !socketRef.current) return;

    const socket = socketRef.current;

    const onDetected = async () => {
      try {
        await HandleNFC();
        setShowModal(false);
      } catch (e) {
        console.log("NFC handle error:", e);
      }
    };

    socket.on("nfc:detected", onDetected);

    return () => {
      socket.off("nfc:detected", onDetected);
    };
  }, [showModal]);



  return (
    <form action="/NFC" method="POST">
      <div className="NFCBackground">
        <div className="NFCTab">
          <div className="NFCLeft">
            <img src={icon} className="NFCIcon" alt="" />
            <button type="button" onClick={() => { navigate("/Home"); }} className="NFCButton">
              <h1>NFC登録</h1>
            </button>
          </div>
        </div>
        <div className="NFCBox">
          <div className="NFCRegister">
            <div className="NFCInput">
              <div className="NFCOneset">
                <p>UserID</p>
                <InputField name="UserID" type="text"
                  onChange={(e) => {
                    setUserId(e.target.value);
                    setError("");
                  }}
                  placeholder="" />
                {error && <p className="NFCError">{error}</p>}
              </div>
              <div className="NFCOneset">
                <p>Password</p>
                <InputField name="Password" type="password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  placeholder="" />
                {error && <p className="NFCError">{error}</p>}
              </div>
            </div>
            <ConfirmButton label="登録" onClick={() => {
              if (userId === "" || password === "") {
                setError("入力が必要です");
              } else {
                setShowModal(true)
              }
            }}
              type="button" />
          </div>
        </div>
        {showModal && (
          <div className="ModalBackground">
            <div className="ModalBox">
              <p>NFCをかざしてください</p>
              <img src={NFCimage} className="NFCimage" alt="" />
              <button type="button"
                onClick={() => setShowModal(false)}
              >キャンセル</button>
            </div>
          </div>
        )}
      </div>
    </form>
  )
}

export default NFC;