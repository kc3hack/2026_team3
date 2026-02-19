// CreateMosaicTx.js
import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade, KeyPair } from 'symbol-sdk/symbol';

export default function CreateMosaicTx({
    networkType = 'testnet',
    senderPrivateKey,
    transferable = true,
    deadlineHours = 2
}) {
    const logOwner = "CreateMosaicTx";
    console.log(`\n${logOwner}-Function is running!\n`);
    console.log(`[${logOwner}] Input => networkType: ${networkType}, transferable: ${transferable}, deadlineHours: ${deadlineHours}`);

    // Facade 初期化
    const facade = new SymbolFacade(networkType);

    // 秘密鍵 → KeyPair
    const keyPair = new KeyPair(new PrivateKey(senderPrivateKey));

    // Deadline 作成
    const deadline = facade.network.fromDatetime(Date.now()).addHours(deadlineHours).timestamp;

    // 0〜2^32-1のランダム数からMosaicIDを生成するためのnonceを生成
    const nonce = Math.floor(Math.random() * 0xffffffff);

    // モザイクを定義するトランザクション作成
    const mosaicDefinitionTx = facade.transactionFactory.create({
        type: 'mosaic_definition_transaction_v1',
        signerPublicKey: keyPair.publicKey,
        duration: 0,
        nonce: nonce,
        mosaicId: undefined,
        flags: {
            supplyMutable: true,
            transferable: transferable,
            restrictable: false,
            revocable: false,
        },
        divisibility: 0,
        deadline: deadline
    });

    // MosaicIDの計算
    const mosaicId = facade.mosaic.createMosaicId(nonce, keyPair.publicKey).toHex();

    console.log(`[${logOwner}] Output => mosaicDefinitionTx: \n${{
        type: mosaicDefinitionTx.type,
        supplyMutable: mosaicDefinitionTx.flags.supplyMutable,
        transferable: mosaicDefinitionTx.flags.transferable,
    }}\nMosaicID: ${mosaicId}`);
    console.log(`[${logOwner}] Shutdown!`);

    return {
        mosaicId,
        mosaicDefinitionTx,
        keyPair,
        facade
    };
}
