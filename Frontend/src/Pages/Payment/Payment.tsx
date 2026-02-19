import "./Payment.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";
import NFCimage from "../../Components/Elements/NFCimage.png";

function Payment() {
    const navigate = useNavigate();
    const [address, setAddress] = useState("");
    const [token, setToken] = useState<number>(0);
    const [handToken, setHandToken] = useState<number>(0);
    const [error, setError] = useState("");
    const { roomId } = useParams<{ roomId: string }>();
    const [roomName, setRoomName] = useState("");
    const [roomIcon, setRoomIcon] = useState("");
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        async function fetchToken() {
            try {
                const res = await fetch("/ClientSendToken/", {
                    method: 'GET'
                });

                if (!res.ok) {
                    toast.error("残金の取得に失敗しました");
                    return;
                }

                const data = await res.json();
                setHandToken(data.HandToken);
            } catch (err) {
                toast.error("通信エラー");
            }
        }

        fetchToken();
    }, []);

    useEffect(() => {
        async function fetchRooms() {
            if (!roomId) return;

            try {
                const res = await fetch('/ClientRooms/', {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ roomId }),
                });

                if (!res.ok) {
                    toast.error("ルーム情報の取得に失敗しました");
                    return;
                }

                const data = await res.json();
                setRoomName(data.roomName);
                setRoomIcon(data.roomIcon);
            } catch (err) {
                toast.error("通信エラー");
            }
        }

        fetchRooms();
    }, [roomId]);


    async function HandlePayment() {
        try {
            const res = await fetch('Login/Token', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ address, token }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error("送金に失敗しました");
                console.log("Faild: SendToken", data);
                return;
            } else {
                toast.success("送金しました");
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
                    HandlePayment();
                }
            } catch (e) {
                console.log("Polling error:", e);
                toast.error('通信エラーが発生しました');
            }
        }, 1000); // 1秒ごと

        return () => clearInterval(interval);

    }, [showModal]);



    return (
        <div className="PaymentBackground">
            <div className="PaymentTab">
                <div className="PaymentLeft">
                    <img src={roomIcon} className="PaymentIcon" alt="" />
                    <button type="button" onClick={() => { navigate("/Home"); }} className="PaymentButton">
                        <h1>{roomName}</h1>
                    </button>
                </div>
            </div>
            <div className="PaymentBox">
                <div className="PaymentRegister">
                    <div className="PaymentInput">
                        <div className="PaymentOneset">
                            <p>宛先</p>
                            <InputField name="address" type="text"
                                onChange={(e) => {
                                    setAddress(e.target.value);
                                    setError("");
                                }}
                                placeholder="" />
                            {error && <p className="PaymentError">{error}</p>}
                        </div>
                        <div className="PaymentOneset">
                            <p>支払額</p>
                            <InputField name="token" type="number"
                                onChange={(e) => {
                                    setToken(Number(e.target.value));
                                    setError("");
                                }}
                                placeholder="0" />
                            {error && <p className="PaymentError">{error}</p>}
                        </div>
                        <div className="PaymentResult">
                            <h3>支払い後の残高</h3>
                            <p>{handToken} → {handToken - token}</p>
                        </div>
                    </div>
                    <ConfirmButton label="支払う" onClick={() => {
                        if (address === "" || token === 0) {
                            setError("入力が必要です");
                        } else if (isNaN(Number(token)) || Number(token) <= 0) {
                            setError("支払額は正の数を入力してください");
                        }
                           else if ((handToken - token) < 0) { 
                            setError("残高が不足しています");
                        }
                        else {
                            setShowModal(true)
                        }
                    }}
                        type="button" />
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
        </div>
    )
}

export default Payment;
