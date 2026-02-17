const axios = require('axious');

async function LeftToken(address, NODE_URL) {
    try{
        const result = await axios.get(`${NODE_URL}/accounts/${address}`);
        return result.data.account.mosaics;
    }catch(err){
        console.error("Error in LeftToken:", err);
        throw err;
    }
}

module.exports = LeftToken;