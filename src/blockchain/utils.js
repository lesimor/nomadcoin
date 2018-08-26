const CryptoJS = require("crypto-js");

const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
    CryptoJS.SHA256(
        index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
    ).toString();

const getTimestamp = () => Math.round(new Date().getTime() / 1000);

module.exports = { createHash, getTimestamp };
