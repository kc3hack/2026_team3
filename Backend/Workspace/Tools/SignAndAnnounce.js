/*========== Manual ==========
# Input
tx:　署名するトランザクション
keyPair: 署名とその検証に使う鍵のペア
facade: mainnet or testnetの指定をしているがそれが一貫性を保てるように引き継ぐ
nodeUrl: つなぐノードのURLを指定する

# Output
なし
========== Manual ==========*/

// SignAndAnnounce.js
async function SignAndAnnounce(tx, keyPair, facade, nodeUrl) {
    // Startup Log
    const logOwner = "SignAndAnnounce";
    console.log(`\n${logOwner}-Function is running!\n`);
    // I/O Log
    console.log(`[${logOwner}] Input => tx: ${{
        type: tx.type,
        recipientAddress: tx.recipientAddress,
        mosaics: tx.mosaics,
        message: tx.message,
        deadline: tx.deadline,
    }}, keyPair: ${keyPair}, facade: ${facade}, nodeUrl: ${nodeUrl}`);

    // 署名
    const signature = facade.signTransaction(keyPair, tx);
    // 署名付きトランザクション作成
    const payload = facade.transactionFactory.createTransactionPayload(tx, signature);
    // アナウンス
    const res = await fetch(`${nodeUrl}/transactions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payload }),
    });
    // アナウンスチェック
    if (!res.ok) {
    const text = await res.text();
    throw new Error(`Announce failed: ${res.status} ${text}`);
    }

    // Shutdown Log
    console.log(`[${logOwner}] Shutdown!`);

    return;
}

module.exports = SignAndAnnounce;
