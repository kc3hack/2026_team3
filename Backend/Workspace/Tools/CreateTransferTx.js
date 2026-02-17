/*========== Manual ==========
# Input(obj)
networkType:　mainnet or testnet
senderPrivateKey: 送り元の秘密鍵
recipientRawAddress: 受け取り手の文字列アドレス
messageText: メッセージをつけたければ
mosaics: どのモザイクをいくつ送りたいか
例: 
mosaics: [
  { mosaicId: XYM_ID, amount: 1_000_000n },
  { mosaicId: TOKEN_ID, amount: 5n }
]
deadlineHours: 有効期限[h]

# Output
createTransferTx: 実際のトランザクション
keyPair: 署名時に必要な秘密鍵/公開鍵
facade: mainnet or testnetの指定をしているがそれが一貫性を保てるように引き継ぐ

#Description
mosaicはBigint型(数字末尾にnがつく)で指定する必要がある。
1_000_000nは1000000と同じであり、ただ見やすくするだけのもの。
========== Manual ==========*/

// CreateTransferTx.js
const symbolSdk = require('symbol-sdk');

function CreateTransferTx({
    networkType = 'testnet',
    senderPrivateKey,
    recipientRawAddress,
    messageText = '',
    mosaics = [],
    deadlineHours = 2,
}) {
    // Startup Log
    const logOwner = "CreateTransferTx";
    console.log(`\n${logOwner}-Function is running!\n`);
    // I/O Log
    console.log(`[${logOwner}] Input => networkType: ${networkType}, recipientRawAddress: ${recipientRawAddress}, messageText: ${messageText}, mosaics: ${mosaics}, deadlineHours: ${deadlineHours}`);

    // Facade 初期化
    const facade = new symbolSdk.facade.SymbolFacade(networkType);
    // 秘密鍵 → KeyPair
    const keyPair = new symbolSdk.symbol.KeyPair( new symbolSdk.PrivateKey(senderPrivateKey) );
    // 宛先アドレス解析（Base32 → 生データ + ネットワーク検証）
    const recipient = facade.network.parseAddress(recipientRawAddress);
    // Deadline 作成
    const deadline = facade.network.fromDatetime(Date.now()).addHours(deadlineHours).timestamp;
    // メッセージ
    const message = new TextEncoder().encode(messageText);

    // トランザクション作成
    const createTransferTx = facade.transactionFactory.create({
        type: 'transfer_transaction_v1',
        signerPublicKey: keyPair.publicKey,
        recipientAddress: recipient.toString(),
        mosaics,
        message,
        deadline
    });

    // I/O Log(JSON.stringify(表示するJSON, 表示項目指定, インデックス空白数指定))
    console.log(`[${logOwner}] Output => createTransferTx: \n${{
        type: createTransferTx.type,
        recipientAddress: createTransferTx.recipientAddress,
        mosaics: createTransferTx.mosaics,
        message: createTransferTx.message,
        deadline: createTransferTx.deadline,
    }}`);
    // Shutdown Log
    console.log(`[${logOwner}] Shutdown!`);

    return {
        createTransferTx,
        keyPair,
        facade
    };
}

module.exports = CreateTransferTx;
