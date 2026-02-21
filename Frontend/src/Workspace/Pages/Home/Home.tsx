import "./Home.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";
import RoomButton from "../../Components/RoomButton/RoomButton";
import icon from "../../Components/Elements/icon.png";

function Home() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState<any[]>([]);
    const [roomName, setRoomName] = useState("");
    const [error, setError] = useState("");

    //ルーム一覧受信
    useEffect(() => {
        async function fetchRooms() {
            try {
                const res = await fetch("/RoomList", {
                    credentials: "include"
                });

                if (!res.ok) {
                    toast.error("ルーム取得失敗");
                    return;
                }

                const data = await res.json();
                setRooms(data.RoomList); // ← ここ重要
            } catch (err) {
                toast.error("通信エラー");
            }
        }

        fetchRooms();
    }, []);

    //ルーム参加送信
    async function HandleHome() {
        try {
            const res = await fetch('/JoinRoom', {
                method: 'POST',
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomName }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error("ルーム参加に失敗しました");
                console.log("Failed: Join room", data);
                return;
            } else {
                toast.success("ルームに参加しました");
                console.log("Success: Join room");

                //参加したルームを追加
                const updated = await fetch("/RoomList", {
                    credentials: "include"
                });
                if (!updated.ok) {
                    toast.error("最新ルーム取得に失敗しました");
                    return;
                }
                const data = await updated.json();
                setRooms(data.RoomList);
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
            console.log("Failed: Communication");
        }
    }

    return (
        <div className="HomeBackground">
            <div className="HomeTab">
                <div className="HomeLeft">
                    <h1>ルーム</h1>
                    {/* ログインボタンいらないならここをコメントアウト */}
                    <ConfirmButton label="アカウント" onClick={() => navigate("/Login")} type="button" />
                </div>
                <div className="HomeRight">
                    <ConfirmButton label="NFC" onClick={() => navigate("/NFC")} type="button" />
                    <ConfirmButton label="ルーム作成" onClick={() => navigate("/Create")} type="button" />
                </div>
            </div>
            <div className="HomeBox">
                <div className="HomeJoin">
                    <div className="HomeField">
                        <InputField name="RoomName" type="text"
                            onChange={(e) => {
                                setRoomName(e.target.value);
                                setError("");
                            }} placeholder="ルーム名" />
                        {error && <p className="HomeError">{error}</p>}
                    </div>
                    <ConfirmButton label="参加" onClick={() => {
                        if (!roomName) {
                            setError("ルーム名を入力してください");
                        } else {
                            HandleHome()
                        }
                    }}
                        type="button" />
                </div>
                <div className="HomeRoom">
                    {rooms.map((room) => (
                        <RoomButton
                            key={room.RoomName}
                            icon={`http://localhost:5000${room.RoomIconPath}` || icon}
                            label={room.RoomName}
                            onClick={() => {
                                navigate(`/Payment/${room.RoomName}`);
                            }
                            }
                            type="button"
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Home;