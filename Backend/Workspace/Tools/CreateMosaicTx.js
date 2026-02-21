// CreateMosaicTx.js

import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';
import { generateMosaicId } from 'symbol-sdk/symbol';

export function CreateMosaicTx({
    networkType = 'testnet',
    senderPrivateKey,
    transferable = true,
    duration = 86400n,
    fee = 1_000_000n,
    deadlineHours = 2
}) {

    const facade = new SymbolFacade(networkType);

    const privateKey = new PrivateKey(senderPrivateKey.trim());
    const keyPair = facade.createAccount(privateKey);

    const safeDeadlineHours = Math.min(Math.max(Number(deadlineHours) || 2, 1), 2);
    const deadline = facade.network
        .fromDatetime(new Date())
        .addHours(safeDeadlineHours)
        .timestamp;

    // uint32 nonce
    const nonce = (Math.random() * 0xffffffff) >>> 0;

    // flags
    let flags = 0;
    flags |= 0x01; // supplyMutable
    if (transferable) flags |= 0x02;

    // ★ mosaicIdは計算だけする（Txには入れない）
    const ownerAddress = facade.network.publicKeyToAddress(keyPair.publicKey);
    const mosaicIdBigInt = generateMosaicId(ownerAddress, nonce);
    const mosaicIdHex = mosaicIdBigInt
        .toString(16)
        .toUpperCase()
        .padStart(16, '0');

    const mosaicDefinitionTx = facade.transactionFactory.create({
        type: 'mosaic_definition_transaction_v1',
        signerPublicKey: keyPair.publicKey,
        fee: BigInt(fee),
        duration: BigInt(duration),
        nonce: nonce,
        flags: flags,
        divisibility: 0,
        deadline: deadline
    });

    return {
        mosaicId: mosaicIdHex,
        mosaicDefinitionTx,
        keyPair,
        facade
    };
}