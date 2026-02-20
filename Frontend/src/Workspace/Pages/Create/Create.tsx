import "./Create.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";
import image from "../../Components/Elements/image.png";

function Create() {
    const navigate = useNavigate();
    const [RoomName, setRoomName] = useState("");
    const [TokenName, setTokenName] = useState("");
    const [RoomIcon, setRoomIcon] = useState<File | null>(null);
    const [TokenIcon, setTokenIcon] = useState<File | null>(null);
    const [TextError, setTextError] = useState("");
    const [RoomIconError, setRoomIconError] = useState("");
    const [TokenIconError, setTokenIconError] = useState("");
    const [Password, setPassword] = useState("");

    async function HandleCreate() {
        const formData = new FormData();
        formData.append("RoomName", RoomName);
        formData.append("MosaicName", TokenName);
        if (RoomIcon) formData.append("RoomIcon", RoomIcon);
        if (TokenIcon) formData.append("MosaicIcon", TokenIcon);
        formData.append("Password", Password);

        try {
            const res = await fetch('/CreateRoom', {
                method: 'POST',
                credentials: "include",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error("ルーム作成に失敗しました");
                console.log("Faild: Create room", data);
                return;
            } else {
                toast.success("ルームを作成しました");
                console.log("Success: Cerate room");
                navigate("/Home");
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
            console.log("Faild: Communication");
        }
    }

    return (
        <form action="" method="POST">
            <div className="CreateBackground">
                <div className="CreateTab">
                    <div className="CreateLeft">
                        <button type="button" onClick={() => { navigate("/Home"); }} className="CreateButton">
                            <h1>ルーム作成</h1>
                        </button>
                    </div>
                </div>
                <div className="CreateBox">
                    <div className="CreateRegister">
                        <div className="CreateInput">
                            <div className="CreateOneset">
                                <p>ルームアイコン</p>
                                <label htmlFor="RoomIcon" className="CreateFile">
                                    <img
                                        src={RoomIcon ? URL.createObjectURL(RoomIcon) : image}
                                        className="CreateImage"
                                        alt="ルームアイコン"
                                    />
                                    <p>画像を選択</p>
                                </label>
                                <input id="RoomIcon" type="file" accept="image/*;capture=camera" style={{ display: "none" }}
                                    onChange={(e) => {
                                        setTextError("");
                                        setRoomIconError("");
                                        setTokenIconError("");
                                        const file = e.target.files?.[0] || null;
                                        setRoomIcon(file);
                                    }}
                                />
                                {RoomIconError && <p className="CreateError">{RoomIconError}</p>}
                            </div>
                            <div className="CreateOneset">
                                <p>ルーム名</p>
                                <InputField name="ルーム名" type="text"
                                    onChange={(e) => {
                                        setRoomName(e.target.value);
                                        setTextError("");
                                    }}
                                    placeholder="" />
                                {TextError && <p className="CreateError">{TextError}</p>}
                            </div>
                        </div>
                        <div className="CreateInput">
                            <div className="CreateOneset">
                                <p>トークンアイコン</p>
                                <label htmlFor="TokenIcon" className="CreateFile">
                                    <img
                                        src={TokenIcon ? URL.createObjectURL(TokenIcon) : image}
                                        className="CreateImage"
                                        alt="トークンアイコン"
                                    />
                                    <p>画像を選択</p>
                                </label>
                                <input id="TokenIcon" type="file" accept="image/*;capture=camera" style={{ display: "none" }}
                                    onChange={(e) => {
                                        setTextError("");
                                        setRoomIconError("");
                                        setTokenIconError("");
                                        const file = e.target.files?.[0] || null;
                                        setTokenIcon(file);
                                    }}
                                />
                                {TokenIconError && <p className="CreateError">{TokenIconError}</p>}
                            </div>
                            <div className="CreateOneset">
                                <p>トークン名</p>
                                <InputField name="トークン名" type="text"
                                    onChange={(e) => {
                                        setTokenName(e.target.value);
                                        setTextError("");
                                    }}
                                    placeholder="" />
                                {TextError && <p className="CreateError">{TextError}</p>}
                            </div>
                        </div>
                        <div className="CreateInput">
                            <div className="CreateOneset">
                                <p>Password</p>
                                <InputField name="パスワード" type="text"
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setTextError("");
                                    }}
                                    placeholder="" />
                                {TextError && <p className="CreateError">{TextError}</p>}
                            </div>
                        </div>
                        <ConfirmButton label="作成" onClick={() => {
                            if (!RoomName || !TokenName || !RoomIcon || !TokenIcon) {
                                if (!RoomName || !TokenName) setTextError("入力が必要です");
                                if (!RoomIcon) setRoomIconError("画像が必要です");
                                if (!TokenIcon) setTokenIconError("画像が必要です");
                                return;
                            } else {
                                HandleCreate();
                            }
                        }}
                            type="button" />
                    </div>
                </div>
            </div>
        </form>
    )
}

export default Create;