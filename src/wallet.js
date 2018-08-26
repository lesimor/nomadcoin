const elliptic = require("elliptic"),
    path = require("path"),
    fs = require("fs"),
    _ = require("lodash"),
    Transactions = require("./transactions"),
    utils = require("./utils/util");

const {
    getPublicKey,
    signTxIn,
    TxIn,
    Transaction,
    TxOut
} = Transactions;

const {getTxId, generatePrivateKey} = utils;
const ec = new elliptic.ec("secp256k1");

const privateKeyLocation = path.join(__dirname, "privateKey");

/**
 * Get private key from file
 * @returns {string}
 */
const getPrivateFromWallet = () => {
    const buffer = fs.readFileSync(privateKeyLocation, "utf8");
    return buffer.toString();
};

/**
 * Get public key from private key
 * @returns {*}
 */
const getPublicFromWallet = () => {
    const privateKey = getPrivateFromWallet();
    const key = ec.keyFromPrivate(privateKey, "hex");
    return key.getPublic().encode("hex");
};

/**
 * Get balance from unspent transaction outputs
 * @param {String} address: Address to get balance
 * @param {UTxOut[]} uTxOuts: Unspent transaction output list
 * @returns {number}
 */
const getBalance = (address, uTxOuts) => {
    return _(uTxOuts)
        .filter(uTxO => uTxO.address === address)
        .map(uTxO => uTxO.amount)
        .sum();
};

/**
 * Initialize wallet
 */
const initWallet = () => {
    if (fs.existsSync(privateKeyLocation)) {
        return;
    }
    const newPrivateKey = generatePrivateKey();

    fs.writeFileSync(privateKeyLocation, newPrivateKey);
};

/**
 * Check if the balance is sufficient
 * @param {Number} amountNeeded
 * @param {UTxOut[]} myUTxOuts
 * @returns {*}
 */
const findAmountInUTxOuts = (amountNeeded, myUTxOuts) => {
    let currentAmount = 0;
    const includedUTxOuts = [];
    for (const myUTxOut of myUTxOuts) {
        includedUTxOuts.push(myUTxOut);
        currentAmount = currentAmount + myUTxOut.amount;
        if (currentAmount >= amountNeeded) {
            const leftOverAmount = currentAmount - amountNeeded;
            return {includedUTxOuts, leftOverAmount};
        }
    }
    throw Error("Not enough founds");
    return false;
};

/**
 * Create transaction output from unspent transaction
 * @param {String} receiverAddress
 * @param {String} myAddress
 * @param {Number} amount
 * @param {Number} leftOverAmount
 * @returns {TxOut[]}
 */
const createTxOuts = (receiverAddress, myAddress, amount, leftOverAmount) => {
    const receiverTxOut = new TxOut(receiverAddress, amount);
    if (leftOverAmount === 0) {
        return [receiverTxOut];
    } else {
        const leftOverTxOut = new TxOut(myAddress, leftOverAmount);
        return [receiverTxOut, leftOverTxOut];
    }
};

/**
 * Filter mempool with invalid txIn
 * @param {UTxOut[]} uTxOutList
 * @param mempool
 */
const filterUTxOutsFromMempool = (uTxOutList, mempool) => {
    const txIns = _(mempool)
        .map(tx => tx.txIns)
        .flatten()
        .value();

    const removables = [];

    for (const uTxOut of uTxOutList) {
        const txIn = _.find(
            txIns,
            txIn =>
                txIn.txOutIndex === uTxOut.txOutIndex && txIn.txOutId === uTxOut.txOutId
        );
        if (txIn !== undefined) {
            removables.push(uTxOut);
        }
    }

    return _.without(uTxOutList, ...removables);
};

/**
 * Create transaction
 * @param {String} receiverAddress
 * @param {Number} amount
 * @param {String} privateKey
 * @param {UTxOut[]} uTxOutList
 * @param {UTxOut[]} memPool
 * @returns {Transaction|*}
 */
const createTx = (receiverAddress, amount, privateKey, uTxOutList, memPool) => {
    const myAddress = getPublicKey(privateKey);
    const myUTxOuts = uTxOutList.filter(uTxO => uTxO.address === myAddress);

    const filteredUTxOuts = filterUTxOutsFromMempool(myUTxOuts, memPool);

    const {includedUTxOuts, leftOverAmount} = findAmountInUTxOuts(
        amount,
        filteredUTxOuts
    );

    const toUnsignedTxIn = uTxOut => {
        const txIn = new TxIn();
        txIn.txOutId = uTxOut.txOutId;
        txIn.txOutIndex = uTxOut.txOutIndex;
        return txIn;
    };

    const unsignedTxIns = includedUTxOuts.map(toUnsignedTxIn);

    const tx = new Transaction();

    tx.txIns = unsignedTxIns;
    tx.txOuts = createTxOuts(receiverAddress, myAddress, amount, leftOverAmount);

    tx.id = getTxId(tx);

    tx.txIns = tx.txIns.map((txIn, index) => {
        txIn.signature = signTxIn(tx, index, privateKey, uTxOutList);
        return txIn;
    });

    return tx;
};

module.exports = {
    initWallet,
    getBalance,
    getPublicFromWallet,
    createTx,
    getPrivateFromWallet
};
