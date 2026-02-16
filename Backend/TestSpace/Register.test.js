const request = require('supertest');
const express = require('express');
const registerRouter = require('../../WorkSpace/routes/register');

// DBPerfモック化
jest.mock('../../WorkSpace/Tools/DBPerf', () => jest.fn());
const DBPerf = require('../../WorkSpace/Tools/DBPerf');

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
jest.mock('../../WorkSpace/Tools/AESControl', () => ({
  encrypt: jest.fn(() => 'encrypted-key')
}));

const app = express();
app.use(express.json());
app.use('/Register', registerRouter);

describe('/Register/Submit', () => {
  beforeEach(() => {
    DBPerf.mockReset();
  });

  it('should return 400 if userId or password missing', async () => {
    const res = await request(app).post('/Register/Submit').send({});
    expect(res.status).toBe(400);
  });

  it('should return 409 if userId exists', async () => {
    DBPerf.mockResolvedValue([{ UserID: 'test' }]); // 重複
    const res = await request(app).post('/Register/Submit').send({ userId: 'test', password: 'pass' });
    expect(res.status).toBe(409);
  });

  it('should succeed with new user', async () => {
    DBPerf.mockResolvedValue([]); // 存在なし
    const res = await request(app).post('/Register/Submit').send({ userId: 'newuser', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redirect', '/Home');
  });
});
