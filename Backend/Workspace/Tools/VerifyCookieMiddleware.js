/*========== Manual ==========
# Input
cookieName: cookieの名前
secretKey: .envから読み取ったcookieのシークレットキー

# Output
req.authにcookieの抽出情報を入れる
認証失敗の場合はエラーを返す

#Description
Server.jsにおいて.envを絶対パス指定にしておきましょう。
例: const dotenv = require('dotenv').config({ path: path.resolve(__dirname, '.env') });

#Usage
app.get("/", Auth(LOGIN_SECRET, 'LoginToken'), (req, res) => {...]});
のようにしてミドルウェアとして使う
========== Manual ==========*/

const jwt = require('jsonwebtoken');

// VerifyCookieMiddleware.js
function VCM(cookieName, secretKey) {
    // Startup Log
    const logOwner = "VCM";
    console.log(`\n${logOwner}-Function is running!\n`);
    // I/O Log
    console.log(`[${logOwner}] Input => cookieName: ${cookieName}`);

    return function (req, res, next) {
        const token = req.cookies?.[cookieName];
        if (!token) return res.sendStatus(401);

        try {
            req.auth = jwt.verify(token, secretKey);
            // Verify Success Log
            console.log(`[${logOwner}] ${cookieName} is verified!`);
            // Shutdown Log
            console.log(`[${logOwner}] Shutdown!`);
            next();
        } catch (err) {
            //Verify Error Log
            console.error(`[${logOwner}] ${cookieName} is not verified!`,err);
            // Shutdown Log
            console.log(`[${logOwner}] Shutdown!`);
            return res.sendStatus(401);
        }
    };
}

module.exports = VCM;
