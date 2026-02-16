const request = require('supertest');
const express = require('express');
const registerRouter = require('../../Workspace/routes/register');
const cookieParser = require('cookie-parser');

// DBPerfモック化
jest.mock('../../Workspace/Tools/DBPerf', () => jest.fn());
const DBPerf = require('../../Workspace/Tools/DBPerf');

// Symbol SDKをモック化
jest.mock('symbol-sdk', () => {
  const original = jest.requireActual('symbol-sdk');
  return {
    ...original,
    PrivateKey: { random: () => 'dummy-private-key' },
    Account: { createFromPrivateKey: () => ({ address: { plain: () => 'dummy-address' } }) },
    NetworkType: { TEST_NET: 'TEST_NET' },
    facade: { SymbolFacade: jest.fn() },
  };
});

// AESControlをモック化
jest.mock('../../Workspace/Tools/AESControl', () => ({
  encrypt: jest.fn(() => 'encrypted-key')
}));

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/Register', registerRouter);

describe('/Register', () => {
  // cookieがある場合
  it('should redirect to Home if cookie exists', async () => {
      const res = await request(app)
          .get('/Register')
          .set('Cookie', ['LoginToken=dummy-jwt']);

      expect(res.status).toBe(302); // リダイレクト
      expect(res.headers.location).toBe('/Home');
  });

  // cookieがない場合
  it('should render register page if no cookie', async () => {
      const res = await request(app)
          .get('/Register');

      expect(res.status).toBe(200);
      expect(res.text).toContain('index.html'); // 登録画面が返る
  });
});

describe('/Register/Submit', () => {
  beforeEach(() => {
    DBPerf.mockReset();
  });

  // 空送信
  it('should return 400 if userId or password missing', async () => {
    const res = await request(app).post('/Register/Submit').send({});
    expect(res.status).toBe(400);
  });

  // 重複検知
  it('should return 409 if userId exists', async () => {
    DBPerf.mockResolvedValue([{ UserID: 'test' }]);
    const res = await request(app).post('/Register/Submit').send({ userId: 'test', password: 'pass' });
    expect(res.status).toBe(409);
  });

  // 登録成功処理
  it('should succeed with new user', async () => {
    DBPerf.mockResolvedValue([]);
    const res = await request(app).post('/Register/Submit').send({ userId: 'newuser', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redirect', '/Home');
  });
});
