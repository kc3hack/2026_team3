import "./Payment.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
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
    
    const [nfcModal, setNFCModal] = useState(false);
    const [reservationID, setReservationID] = useState("");

    useEffect(() => {
        async function fetchToken() {
            try {
                const res = await fetch("/SendTokenByNFC/", {
                    method: 'GET',
                    credentials: "include"
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
<<<<<<< HEAD
            if (!roomId) return;
=======
            if (!decodedRoomName) return;

>>>>>>> 6028147d9933c8436467e0b19dd758729f43c4b6
            try {
                const res = await fetch('/SendTokenByNFC/', {
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

    // 連続決済用のセッション(予約)を作成する
    async function HandleReserveForNFC() {
        try {
            const res = await fetch('/SendTokenByNFC/NFC/Submit', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
<<<<<<< HEAD
                body: JSON.stringify({
                    sendtoUserID: address,
                    Amount: token,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error("NFC受付の準備に失敗しました");
                console.log("Faild: NFC Reserve", data);
                return false;
            } else {
                const data = await res.json();
                setReservationID(data.reservationID);
                setNFCModal(true);
                toast.success("NFC受付を開始しました。次々とカードをかざしてください！");
                return true;
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
            console.log("Faild: Communication");
            return false;
        }
    }

    async function HandleNfcPayment(uid: string, encrypted_password?: string | null) {
        try {
            const res = await fetch('/SendTokenByNFC/NFC', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ uid, reservationID, encrypted_password }),
=======
                body: JSON.stringify({ address, token, password }),
>>>>>>> 6028147d9933c8436467e0b19dd758729f43c4b6
            });

            if (!res.ok) {
                const errorText = await res.text();
                toast.error(`決済処理に失敗しました: ${errorText}`);
            }
        } catch (err) {
            toast.error('決済リクエストの送信に失敗しました');
            console.log("Faild: NFC Payment Request", err);
        }
    }

    useEffect(() => {
        if (!nfcModal || !reservationID) return;

        const socket = io('/', { transports: ['websocket'] });

        // NFC読取イベントを受けたら、UIDを使ってSendTokenByNFCへ転送
        const onNfcDetected = async (payload: { uid?: string; encrypted_password?: string | null }) => {
            if (!payload?.uid) return;
            await HandleNfcPayment(payload.uid, payload.encrypted_password ?? null);
        };

<<<<<<< HEAD
        // バックエンドからの決済結果イベントをリッスン
        const onPaymentResult = (payload: { reservationID: string, status: string, uid?: string, message?: string }) => {
            // 他の端末の予約IDイベントは無視する
            if (payload.reservationID !== reservationID) return;

            if (payload.status === 'success') {
                toast.success(`決済完了！ (UID: ${payload.uid})`);
                // 残高をマイナスして画面を更新 (モーダルは開いたまま)
                setHandToken(prev => prev - token);
            } else if (payload.status === 'cooldown') {
                toast.error(`連続タッチはできません。少し待ってからかざしてください。`);
            } else {
                toast.error(`決済エラー: ${payload.message}`);
=======
                if (data.nfcRead === true) {
                    setNFCModal(false);
                    clearInterval(interval);
                    await HandlePayment();
                }
            } catch (e) {
                console.log("Polling error:", e);
                toast.error('通信エラーが発生しました');
>>>>>>> 6028147d9933c8436467e0b19dd758729f43c4b6
            }
        };

        socket.on('nfc:detected', onNfcDetected);
        socket.on('payment:result', onPaymentResult);

        return () => {
            socket.off('nfc:detected', onNfcDetected);
            socket.off('payment:result', onPaymentResult);
            socket.disconnect();
        };
    }, [nfcModal, reservationID, token]);

    return (
        <div className="PaymentBackground">
            <div className="PaymentTab">
                {/* 既存のヘッダーUI */}
                <div className="PaymentLeft">
                    <img src={roomIcon} className="PaymentIcon" alt="" />
                    <button type="button" onClick={() => { navigate("/Home"); }} className="PaymentButton">
                        <h1>{decodedRoomName}</h1>
                    </button>
                </div>
            </div>
            <div className="PaymentBox">
                <div className="PaymentRegister">
                    {/* 既存の入力UI */}
                    <div className="PaymentInput">
                        <div className="PaymentOneset">
                            <p>宛先</p>
                            <InputField name="address" type="text" placeholder="" onChange={(e) => { setAddress(e.target.value); setError(""); }} />
                        </div>
                        <div className="PaymentOneset">
                            <p>支払額</p>
                            <InputField name="token" type="number" placeholder="0" onChange={(e) => { setToken(Number(e.target.value)); setError(""); }} />
                        </div>
                        <div className="PaymentResult">
                            <h3>現在の残高</h3>
                            <p>{handToken}</p> {/* 連続決済なので、手持ちの残高だけ表示するように変更 */}
                        </div>
                        {error && <p className="PaymentError" style={{textAlign: "center"}}>{error}</p>}
                    </div>
<<<<<<< HEAD
                    <ConfirmButton label="受付開始 (改札モード)" onClick={() => {
                        if (address === "" || token === 0) setError("入力が必要です");
                        else if (isNaN(Number(token)) || Number(token) <= 0) setError("支払額は正の数を入力してください");
                        else HandleReserveForNFC();
                    }} type="button" />
=======
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
>>>>>>> 6028147d9933c8436467e0b19dd758729f43c4b6
                </div>
            </div>

            {nfcModal && (
                <div className="ModalBackground">
                    <div className="ModalBox">
                        <p>NFC受付中...<br/><span style={{fontSize: "0.8em"}}>カードを次々とかざしてください</span></p>
                        <img src={NFCimage} className="NFCimage" alt="" />
                        <ConfirmButton label="受付を終了する" onClick={() => { 
                            setNFCModal(false);
                            setReservationID(""); // セッションをリセット
                        }} type="button" />
                    </div>
                </div>
            )}
        </div>
    )
}

export default Payment;