import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';

export default async function SignAndAnnounce(tx, privateKey, facade, nodeUrl) {
    // Startup Log
    const logOwner = "SignAndAnnounce";
    console.log(`\n${logOwner}-Function is running!\n`);
    
    // I/O Log 
    // ※ テンプレートリテラル( `${}` )内でオブジェクトを呼ぶと [object Object] になってしまうため、
    // カンマ区切りでオブジェクトとして安全にコンソールに出力します。
    console.log(`[${logOwner}] Input => tx:`, {
        type: tx.type,
        recipientAddress: tx.recipientAddress ? tx.recipientAddress.toString() : undefined,
        mosaicsCount: tx.mosaics ? tx.mosaics.length : 0,
        deadline: tx.deadline ? tx.deadline.toString() : undefined,
    });
    console.log(`[${logOwner}] Input => nodeUrl: ${nodeUrl}`);

    // 秘密鍵 → KeyPair (v3推奨の書き方)
    const privateKeyObject = new PrivateKey(privateKey.trim());
    const account = facade.createAccount(privateKeyObject);

    try {
        // 署名 (v3 SDK)
        const signature = facade.signTransaction(account.keyPair, tx);
        // ！！！ここを追加！！！
        const hash = facade.hashTransaction(tx).toString();
        console.log(`[Debug] Transaction Hash: ${hash}`);
        
        // 署名付きトランザクションペイロード作成 (v3 SDK)
        // ※ v3では attachSignature が JSON形式の文字列（'{"payload": "..."}'）を返すのが標準的です。
        // もし既存の createTransactionPayload が動作している場合はそちらをお使いください。
        let payloadString;
        if (typeof facade.transactionFactory.constructor.attachSignature === 'function') {
            payloadString = facade.transactionFactory.constructor.attachSignature(tx, signature);
        } else {
            // 下位互換・代替ロジック
            const payload = facade.transactionFactory.createTransactionPayload(tx, signature);
            payloadString = JSON.stringify({ payload });
        }

        // アナウンス
        const res = await fetch(`${nodeUrl}/transactions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: payloadString,
        });

        // アナウンスチェック
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Announce failed: ${res.status} ${text}`);
        }

        console.log(`[${logOwner}] Successfully announced transaction!`);

    } catch (error) {
        console.error(`[${logOwner}] Error:`, error);
        throw error; // ルーター側のcatchで捕まえられるようにエラーを再スローします
    }

    // Shutdown Log
    console.log(`[${logOwner}] Shutdown!`);

    return;
}

