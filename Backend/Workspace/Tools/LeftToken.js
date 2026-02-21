import axios from 'axios';

const DEFAULT_TESTNET_CURRENCY_MOSAIC_ID = '72C0212E67A08BCE';

export async function LeftToken(address, nodeUrl) {
    try {
        const result = await axios.get(`${nodeUrl}/accounts/${address}`);
        console.log("[Debug] LeftToken API result:", result.data);
        return result.data.account.mosaics || [];
    } catch (err) {
        if (err?.response?.status === 404) {
            return [];
        }
        console.error('Error in LeftToken:', err);
        throw err;
    }
}

export async function LeftTokenAmount(address, mosaicIdHex, nodeUrl) {
    const mosaics = await LeftToken(address, nodeUrl);

    const normalizedSearchId = String(mosaicIdHex)
        .replace(/^0x/, '')
        .toUpperCase();

    const target = mosaics.find((m) => {
        // id が string か object か両対応
        const rawId =
            typeof m.id === 'string'
                ? m.id
                : typeof m.id === 'object' && m.id !== null
                    ? m.id.id
                    : '';

        const currentId = String(rawId)
            .replace(/^0x/, '')
            .toUpperCase();

        console.log(`Comparing: API(${currentId}) vs Search(${normalizedSearchId})`);

        return currentId === normalizedSearchId;
    });

    console.log(`[Debug] LeftTokenAmount - Target Mosaic Found:`, target);

    return target ? BigInt(target.amount) : 0n;
}

export async function GetCurrencyMosaicId(nodeUrl) {
    try {
        const result = await axios.get(`${nodeUrl}/network/currencyMosaicId`);
        const rawId = result?.data?.mosaicId;
        if (!rawId) {
            return DEFAULT_TESTNET_CURRENCY_MOSAIC_ID;
        }

        return String(rawId)
            .replace(/^0x/, '')
            .toUpperCase();
    } catch (err) {
        console.warn('[Warn] Failed to fetch currency mosaic id. Fallback to testnet default.', err?.message);
        return DEFAULT_TESTNET_CURRENCY_MOSAIC_ID;
    }
}