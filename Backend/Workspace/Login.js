const express = require('express');
const argon2 = require('argon2');
const dotenv = require('dotenv');
const path = require('path');
const app = express();

// Toolsの読み込み
const CreateCookie = require('./CreateCookie');
// .env を絶対パスで読み込む
//console.log(__dirname);
//dotenv.config({ path: path.resolve(__dirname, '.env') });

app.use(express.json());

async function generateHash() {
    const hash = await argon2.hash("password123");
    console.log(hash); 
}
generateHash();

// 擬似的なIdentifyテーブル（本来はDBから取得）
// Register時に argon2.hash() で保存されたデータを想定
const mockUserTable = {
    "user123": {
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$7x/8Mf2nBE51Bk5fToOgCg$bbTBskeooo4sh0GPScRvcmP8nndET6LMH3GkylDx9Wc", // ハッシュ化されたパスワード
        address: "0x1234567890abcdef"
    }
};

app.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body); // 1. リクエストが届いているか
    const { userId, password } = req.body;

    const user = mockUserTable[userId];
    if (!user) {
        console.log('User not found:', userId); // 2. ユーザー検索結果
        return res.status(401).json({ error: '認証に失敗しました（ユーザー不在）' });
    }

    try {
        const isMatch = await argon2.verify(user.passwordHash, password);
        console.log('Password match:', isMatch); // 3. 照合結果

        if (isMatch) {
            console.log('Secret Key Check:', process.env.COOKIE_SECRET ? 'Defined' : 'Undefined');
            if(isMatch){
                CreateCookie({
                    res,
                    cookieName: 'auth_token',
                    payload: { userId: userId, address: user.address },
                    secretKey: process.env.COOKIE_SECRET,
                    deadlineHours: 24,
                    httpOnly: true,
                    sameSite: 'strict'
                });

                return res.json({
                    message: 'cookie issued',
                    address: user.address
                });
            }
            else{
                // パスワード不一致
                return res.status(401).json({ error: '認証に失敗しました（パスワード不一致）' });
            }
        }
    } catch (err) {
        console.error('Argon2 Error:', err); // 4. ハッシュ形式エラーなどの捕捉
        return res.status(500).json({ error: 'サーバー内部エラー' });
    }

    
});

app.listen(5000, () => { console.log('start'); });