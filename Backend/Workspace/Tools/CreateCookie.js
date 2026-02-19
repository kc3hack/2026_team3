/*========== Manual ==========
# Input(obj)
res: (req, res) => {}のres
cookieName: cookieの名前
payload: { userId: 1 }のようなcookieに入れ込む情報
secretKey: .envから読み取ったcookieのシークレットキー
deadlineHours: 有効期限[h]
httpOnly = true: true or false
sameSite = 'strict': 'strict' or 'lax' or 'none'

# Output
クライアントへCookieを返す

#Description
Server.jsにおいて.envを絶対パス指定にしておきましょう。
例: const dotenv = require('dotenv').config({ path: path.resolve(__dirname, '.env') });
========== Manual ==========*/

import jwt from 'jsonwebtoken';

// CreateCookie.js
function CreateCookie({res, cookieName, payload, secretKey, deadlineHours, httpOnly = true, sameSite = 'strict'}) {
    // Startup Log
    const logOwner = "CreateCookie";
    console.log(`\n${logOwner}-Function is running!\n`);
    // I/O Log
    console.log(`[${logOwner}] Input => cookieName: ${cookieName}, payload: ${JSON.stringify(payload)}, deadlineHours: ${deadlineHours}, httpOnly: ${httpOnly}, sameSite: ${sameSite}`);

    // Tokenの作成
    const token = jwt.sign(payload, secretKey, { expiresIn: `${deadlineHours}h` });
    // Cookieの配布
    res.cookie(cookieName, token, { httpOnly: httpOnly, sameSite: sameSite });

    // Shutdown Log
    console.log(`[${logOwner}] Shutdown!`);
}

export default CreateCookie;