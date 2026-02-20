import "./NFC.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
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

    async function HandleNFC() {
        try {
            const res = await fetch('NFC/Submit', { 
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error("登録に失敗しました");
                console.log("Faild: SendToken", data);
                return;
            } else {
                toast.success("NFCを登録しました");
                console.log("Success: SendToken");
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
            console.log("Faild: Communication");
        }
    }

    useEffect(() => { //NFC受信
        if (!showModal) return;

        //ポーリング
        const interval = setInterval(async () => {
            try {
            const res = await fetch("/NFC/Submit", {
                credentials: "include"
            });

            const data = await res.json();

            if (data.nfcRead === true) {
                setShowModal(false);
                clearInterval(interval);
                HandleNFC();
            }
        } catch (e) {
            console.log("Polling error:", e);
            //toast.error('通信エラーが発生しました');
        }}, 1000); // 1秒ごと

        return () => clearInterval(interval);

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