const CryptoJS = require("crypto-js"),
    _ = require("lodash"),
    elliptic = require("elliptic");
const {Block} = require("../block");
const ec = new elliptic.ec("secp256k1");

const toHexString = byteArray => {
    return Array.from(byteArray, byte => {
        return ("0" + (byte & 0xff).toString(16)).slice(-2);
    }).join("");
};

/**
 * Create block hash with block attributes.
 * @param {Number} index
 * @param {String} previousHash
 * @param {String} timestamp
 * @param {Object} data
 * @param {Number} difficulty
 * @param {Number} nonce
 * @returns {String}: Hash string of the block
 */
const createHash = (index, previousHash, timestamp, data, difficulty, nonce) =>
// Generate hash with block attributes.
    CryptoJS.SHA256(
        index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce
    ).toString();

/**
 * Generate hash of block
 * @param {Block} block
 * @returns {String}
 */
const getBlocksHash = block =>
    createHash(
        block.index,
        block.previousHash,
        block.timestamp,
        block.data,
        block.difficulty,
        block.nonce
    );

// Get current time stamp
const getTimestamp = () => Math.round(new Date().getTime() / 1000);

/**
 * Generate Transaction ID with its contents
 * @param {Transaction} tx
 * @returns {String}: Hash ID with transaction contents.
 */
const getTxId = tx => {
    const txInContent = tx.txIns
        .map(txIn => txIn.txOutId + txIn.txOutIndex)
        .reduce((a, b) => a + b, "");

    const txOutContent = tx.txOuts
        .map(txOut => txOut.address + txOut.amount)
        .reduce((a, b) => a + b, "");

    return CryptoJS.SHA256(txInContent + txOutContent + tx.timestamp).toString();
};

/**
 * Find unspent transaction output among unspent transaction output list
 * @param {String} txOutId : Target unspent transaction ID.
 * @param {Number} txOutIndex : Target unspent transaction index.
 * @param {Array} uTxOutList : Unspent transaction output list.
 * @returns {UTxOut | null}
 */
const findUTxOut = (txOutId, txOutIndex, uTxOutList) => {
    return uTxOutList.find(
        uTxO => uTxO.txOutId === txOutId && uTxO.txOutIndex === txOutIndex
    );
};

/**
 * Get amount of transaction input from unspent transaction output list
 * @param {TxIn} txIn
 * @param {UTxOut[]} uTxOutList
 * @returns {*}
 */
const getAmountInTxIn = (txIn, uTxOutList) =>
    findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount;

/**
 * Generate random private key
 * @returns {string}
 */
const generatePrivateKey = () => {
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate();
    return privateKey.toString(16);
};

/**
 * Extract TxIns from mempool
 * @param {Transaction[]} mempool
 * @returns {TxIn[]}
 */
const getTxInsInPool = mempool => {
    return _(mempool)
        .map(tx => tx.txIns)
        .flatten()
        .value();
};


module.exports = {
    toHexString,
    createHash,
    getBlocksHash,
    getTimestamp,
    getTxId,
    findUTxOut,
    getAmountInTxIn,
    generatePrivateKey,
    getTxInsInPool
};
