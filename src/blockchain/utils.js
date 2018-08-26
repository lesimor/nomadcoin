const CryptoJS = require("crypto-js");
const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
    CryptoJS.SHA256(
        index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
    ).toString();

const getTimestamp = () => Math.round(new Date().getTime() / 1000);

const sumDifficulty = anyBlockchain =>
    anyBlockchain
        .map(block => block.difficulty)
        .map(difficulty => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);


module.exports = { createHash, getTimestamp, sumDifficulty };
