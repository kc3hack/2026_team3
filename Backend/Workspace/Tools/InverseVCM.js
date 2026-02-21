/*========== Manual ==========
# Input
cookieName: cookieの名前
secretKey: .envから読み取ったcookieのシークレットキー

# Output
認証失敗の場合は指定したに飛ばす

#Description
Server.jsにおいて.envを絶対パス指定にしておきましょう。
例: const dotenv = require('dotenv').config({ path: path.resolve(__dirname, '.env') });

#Usage
app.get("/", InverseVCM('LoginToken', LOGIN_SECRET), (req, res) => {...]});
のようにしてミドルウェアとして使う
========== Manual ==========*/

import jwt from 'jsonwebtoken';

// InverseVCM.js
function InverseVCM(cookieName, secretKey) {
    // Startup Log
    const logOwner = "InverseVCM";
    console.log(`\n${logOwner}-Function is running!\n`);
    // I/O Log
    console.log(`[${logOwner}] Input => cookieName: ${cookieName}`);

    return function (req, res, next) {
        const token = req.cookies?.[cookieName];
        if (!token) return next();

        try {
            jwt.verify(token, secretKey);
            // Verify Success Log
            console.log(`[${logOwner}] ${cookieName} is verified!`);
            // Shutdown Log
            console.log(`[${logOwner}] Shutdown!`);
            return res.redirect("/Home");
        } catch (err) {
            //Verify Error Log
            console.error(`[${logOwner}] ${cookieName} is not verified!`,err);
            // Shutdown Log
            console.log(`[${logOwner}] Shutdown!`);

            // 検証に問題があったらなにもしない
            res.clearCookie(cookieName);
            return next();
        }
    };
}

export default InverseVCM;
