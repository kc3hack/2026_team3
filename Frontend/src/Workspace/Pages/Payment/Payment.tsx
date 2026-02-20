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
    const { roomName } = useParams<{ roomName: string }>();
    const decodedRoomName = decodeURIComponent(roomName ?? "");
    const [roomIcon, setRoomIcon] = useState("");
    const [password, setPassword] = useState("");
    const [passModal, setPassModal] = useState(false);
    const [nfcModal, setNFCModal] = useState(false);

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
            if (!decodedRoomName) return;

            try {
                const res = await fetch('/ClientRooms/', {
                    method: 'POST',
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ roomName: decodedRoomName }),
                });

                if (!res.ok) {
                    toast.error("ルーム情報の取得に失敗しました");
                    return;
                }

                const data = await res.json();
                setRoomIcon(data.roomIcon);
            } catch (err) {
                toast.error("通信エラー");
            }
        }

        fetchRooms();
    }, [decodedRoomName]);

    async function HandlePayment() {
        try {
            const res = await fetch('Login/Token', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ address, token, password }),
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
        if (!nfcModal) return;

        //ポーリング
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/NFC/Submit", {
                    credentials: "include"
                });

                const data = await res.json();

                if (data.nfcRead === true) {
                    setNFCModal(false);
                    clearInterval(interval);
                    await HandlePayment();
                }
            } catch (e) {
                console.log("Polling error:", e);
                toast.error('通信エラーが発生しました');
            }
        }, 1000); // 1秒ごと

        return () => clearInterval(interval);

    }, [nfcModal]);

    return (
        <div className="PaymentBackground">
            <div className="PaymentTab">
                <div className="PaymentLeft">
                    <img src={roomIcon} className="PaymentIcon" alt="" />
                    <button type="button" onClick={() => { navigate("/Home"); }} className="PaymentButton">
                        <h1>{decodedRoomName}</h1>
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
                        else if ((handToken - token) < 0) { //本来はhandToken
                            setError("残高が不足しています");
                        }
                        else {
                            setPassModal(true)
                        }
                    }}
                        type="button" />
                </div>
            </div>
             {passModal && (
                    <div className="ModalBackground">
                        <div className="ModalPassBox">
                            <p>パスワードを入力してください</p>
                            <div className="ModalInput">
                                <InputField name="password" type="password"
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="" />
                                {error && <p className="PaymentError">{error}</p>}
                            </div>
                            <div className="PassModal">
                                <ConfirmButton label="確認" onClick={() => {
                                    if (password === "") {
                                        setError("入力が必要です");
                                    }
                                    else {
                                        setPassModal(false)
                                        setNFCModal(true)
                                    }
                                }}type="button" />

                                <ConfirmButton label="戻る" onClick={() => {setPassModal(false)}}type="button" />
                            </div>
                        </div>
                    </div>
                )}
                {nfcModal && (
                    <div className="ModalBackground">
                        <div className="ModalBox">
                            <p>NFCをかざしてください</p>
                            <img src={NFCimage} className="NFCimage" alt="" />
                            <ConfirmButton label="キャンセル" onClick={() => {setNFCModal(false)}}type="button" />
                        </div>
                    </div>
                )}
        </div>
    )
}

export default Payment;