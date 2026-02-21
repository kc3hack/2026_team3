// CreateSupplyTx.js
import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';

export const CreateSupplyTx = ({
    networkType = 'testnet',
    senderPrivateKey,
    supply = 1_000_000n,
    mosaicId,
    deadlineHours = 2
}) => {

    const logOwner = "CreateSupplyTx";
    console.log(`\n[${logOwner}] Starting...`);

    if (!senderPrivateKey)
        throw new Error("senderPrivateKey is undefined");

    if (!mosaicId)
        throw new Error("mosaicId is undefined");

    // Facade
    const facade = new SymbolFacade(networkType);

    // Account
    const privateKey = new PrivateKey(senderPrivateKey.trim());
    const keyPair = facade.createAccount(privateKey);

    // Deadline
    const deadline = facade.network
        .fromDatetime(new Date())
        .addHours(Number(deadlineHours))
        .timestamp;

    // ★ ここ重要
    const supplyTx = facade.transactionFactory.create({
        type: 'mosaic_supply_change_transaction_v1',
        signerPublicKey: keyPair.publicKey,

        mosaicId: BigInt('0x' + mosaicId), // 必ずBigInt
        delta: BigInt(supply),             // 必ずBigInt
        action: 0,                         // ★ increaseは0

        deadline
    });

    console.log(`[${logOwner}] Transaction created.`);
    console.log(`[${logOwner}] Shutdown!`);

    return {
        supplyTx,
        keyPair,
        facade
    };
};

export default CreateSupplyTx;