/*========== Manual ==========
# Input(obj)
networkType:　mainnet or testnet
senderPrivateKey: 送り元の秘密鍵
transferable: 発行者以外が送信できるかどうか(true or false)
deadlineHours: 有効期限[h]

# Output
mosaicId: 発行したMosaicIDの16進数表現
mosaicDefinitionTx: 実際のトランザクション
keyPair: 署名時に必要な秘密鍵/公開鍵
facade: mainnet or testnetの指定をしているがそれが一貫性を保てるように引き継ぐ
========== Manual ==========*/

// CreateMosaicTx.js
import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';
import { generateMosaicId } from 'symbol-sdk/symbol';

export function CreateMosaicTx({
    networkType = 'testnet',
    senderPrivateKey,
    transferable = true,
    deadlineHours = 2
}) {
    // Startup Log
    const logOwner = "CreateMosaicTx";
    console.log(`\n${logOwner}-Function is running!\n`);
    console.log(`[${logOwner}] Input => networkType: ${networkType}, transferable: ${transferable}, deadlineHours: ${deadlineHours}`);

    if (!senderPrivateKey) {
        throw new Error("senderPrivateKey is undefined");
    }

    console.log("senderPrivateKey:", senderPrivateKey);
    console.log("type:", typeof senderPrivateKey);
    console.log("length:", senderPrivateKey?.length);

    // Facade 初期化
    const facade = new SymbolFacade(networkType);

    // 秘密鍵 → KeyPair
    const normalizedPrivateKey = senderPrivateKey.trim();
    const privateKeyObject = new PrivateKey(normalizedPrivateKey);
    const keyPair = facade.createAccount(privateKeyObject);

    // Deadline 作成
    const deadline = facade.network
        .fromDatetime(new Date())
        .addHours(Number(deadlineHours))
        .timestamp;

    console.log(`[${logOwner}] Intermediate => KeyPair created, Deadline calculated`);

    // 0〜2^32-1 のランダムnonce生成
    const nonce = Math.floor(Math.random() * 0xffffffff);

    console.log(`[${logOwner}] Intermediate => Nonce generated: ${nonce}`);

    // Mosaic定義トランザクション作成
    const mosaicDefinitionTx = facade.transactionFactory.create({
        type: 'mosaic_definition_transaction_v1',
        signerPublicKey: keyPair.publicKey,
        duration: 0,
        nonce: nonce,
        flags: {
            supplyMutable: true,
            transferable: transferable,
            restrictable: false,
            revocable: false,
        },
        divisibility: 0,
        deadline: deadline
    });

    console.log(`[${logOwner}] Intermediate => MosaicDefinitionTx created with type: ${mosaicDefinitionTx.type}`);

    
    const ownerAddress = facade.network.publicKeyToAddress(keyPair.publicKey);
    // MosaicID計算
    const mosaicIdBigInt = generateMosaicId(ownerAddress, nonce);
    const mosaicIdHex = mosaicIdBigInt.toString(16).toUpperCase().padStart(16, '0');

    console.log(`[${logOwner}] Output => 
        Type: ${mosaicDefinitionTx.type}
        SupplyMutable: ${mosaicDefinitionTx.flags.supplyMutable}
        Transferable: ${mosaicDefinitionTx.flags.transferable}
        MosaicID: ${mosaicIdHex}
    `);

    console.log(`[${logOwner}] Shutdown!`);

    return {
        mosaicId: mosaicIdHex,
        mosaicDefinitionTx,
        keyPair,
        facade
    };
}

