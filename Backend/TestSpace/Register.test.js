import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registerPath = path.resolve(__dirname, '../Workspace/Routes/Register.js');
const registerExists = fs.existsSync(registerPath);
const describeIf = registerExists ? describe : describe.skip;

jest.unstable_mockModule('../Workspace/Tools/DBPerf.js', () => ({
  default: jest.fn()
}));

jest.unstable_mockModule('../Workspace/Tools/AESControl.js', () => ({
  encrypt: jest.fn(() => 'encrypted-key'),
  decrypt: jest.fn()
}));

jest.unstable_mockModule('symbol-sdk', async () => {
  const original = await jest.requireActual('symbol-sdk');
  return {
    ...original,
    PrivateKey: {
      random: () => ({ toString: () => 'dummy-private-key' })
    },
    facade: {
      SymbolFacade: jest.fn(() => ({
        createAccount: () => ({ address: { toString: () => 'dummy-address' } })
      }))
    }
  };
});

const { default: DBPerf } = await import('../Workspace/Tools/DBPerf.js');

let registerRouter;
if (registerExists) {
  const registerModule = await import('../Workspace/Routes/Register.js');
  registerRouter = registerModule.default;
}

const app = express();
app.use(express.json());
app.use(cookieParser());

if (registerExists && registerRouter) {
  app.use('/Register', registerRouter);
}

describeIf('/Register/Submit', () => {
  beforeEach(() => {
    DBPerf.mockReset();
  });

  it('should return 400 if userId or password missing', async () => {
    const res = await request(app).post('/Register/Submit').send({});
    expect(res.status).toBe(400);
  });

  it('should return 409 if userId exists', async () => {
    DBPerf.mockResolvedValue([{ UserID: 'test' }]);
    const res = await request(app).post('/Register/Submit').send({ userId: 'test', password: 'pass' });
    expect(res.status).toBe(409);
  });

  it('should succeed with new user', async () => {
    DBPerf.mockResolvedValue([]);
    const res = await request(app).post('/Register/Submit').send({ userId: 'newuser', password: 'pass' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('redirect', '/Home');
  });
});
