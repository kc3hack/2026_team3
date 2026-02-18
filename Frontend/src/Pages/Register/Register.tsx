import "./Register.css";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";
import icon from "../../Components/Elements/icon.png";

function Register() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    async function HandleLogin() {
        try {
            const res = await fetch('Login/Submit', {
                method: 'POST',
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ userId, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error("ログインに失敗しました");
                console.log("Faild: Login", data);
                return;
            } else {
                toast.success("ログインしました");
                console.log("Success: Login");
                navigate("/Home");
            }
        } catch (err) {
            toast.error('通信エラーが発生しました');
            console.log("Faild: Communication");
        }
    }

    return (
        <form action="" method="POST">
            <div className="LoginBackground">
                <div className="LoginTab">
                    <div className="LoginLeft">
                        <img src={icon} className="LoginIcon" alt="" />
                        <h1>登録</h1>
                    </div>
                </div>
                <div className="LoginBox">
                    <div className="LoginRegister">
                        <div className="LoginInput">
                            <div className="LoginOneset">
                                <p>UserID</p>
                                <InputField name="UserID" type="text"
                                    onChange={(e) => {
                                        setUserId(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="" />
                                {error && <p className="LoginError">{error}</p>}
                            </div>
                            <div className="LoginOneset">
                                <p>Password</p>
                                <InputField name="Password" type="password"
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError("");
                                    }}
                                    placeholder="" />
                                {error && <p className="LoginError">{error}</p>}
                            </div>
                        </div>
                        <ConfirmButton label="送信"
                            onClick={() => {
                                if (userId === "" || password === "") {
                                    setError("必要事項を入力してください");
                                } else {
                                    HandleLogin();
                                }
                            }}
                            type="button" />
                    </div>
                </div>
            </div>
        </form>
    )
}

export default Register;
