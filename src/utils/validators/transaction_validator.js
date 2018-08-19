const _ = require("lodash"),
    utils = require("../util"),
    elliptic = require("elliptic");

const ec = new elliptic.ec("secp256k1");

const {getTxId, getAmountInTxIn} = utils;

const {COINBASE_AMOUNT} = require("../constants");

/**
 * Validate txIn
 * @param {TxIn} txIn : Transaction INPUT to validate.
 * @returns {boolean}
 */
const isTxInStructureValid = txIn => {
    if (txIn === null) {
        console.log("The txIn appears to be null");
        return false;
    } else if (typeof txIn.signature !== "string") {
        console.log("The txIn doesn't have a valid signature");
        return false;
    } else if (typeof txIn.txOutId !== "string") {
        console.log("The txIn doesn't have a valid txOutId");
        return false;
    } else if (typeof txIn.txOutIndex !== "number") {
        console.log("The txIn doesn't have a valid txOutIndex");
        return false;
    } else {
        return true;
    }
};

/**
 * Validate address
 * @param {String} address: Address to validate
 * @returns {boolean}
 */
const isAddressValid = address => {
    if (address.length !== 130) {
        console.log("The address length is not the expected one");
        return false;
    } else if (address.match("^[a-fA-F0-9]+$") === null) {
        console.log("The address doesn't match the hex patter");
        return false;
    } else if (!address.startsWith("04")) {
        console.log("The address doesn't start with 04");
        return false;
    } else {
        return true;
    }
};

/**
 * Validate transaction OUTPUT
 * @param {TxOut} txOut: Transaction output to validate
 * @returns {boolean}
 */
const isTxOutStructureValid = txOut => {
    if (txOut === null) {
        return false;
    } else if (typeof txOut.address !== "string") {
        console.log("The txOut doesn't have a valid string as address");
        return false;
    } else if (!isAddressValid(txOut.address)) {
        console.log("The txOut doesn't have a valid address");
        return false;
    } else if (typeof txOut.amount !== "number") {
        console.log("The txOut doesn't have a valid amount");
        return false;
    } else {
        return true;
    }
};

/**
 * Validate transaction structure.
 * @param {Transaction} tx: Transaction to validate.
 * @returns {boolean}
 */
const isTxStructureValid = tx => {
    if (typeof tx.id !== "string") {
        console.log("Tx ID is not valid");
        return false;
    } else if (!(tx.txIns instanceof Array)) {
        console.log("The txIns are not an array");
        return false;
    } else if (
        !tx.txIns.map(isTxInStructureValid).reduce((a, b) => a && b, true)
    ) {
        console.log("The structure of one of the txIn is not valid");
        return false;
    } else if (!(tx.txOuts instanceof Array)) {
        console.log("The txOuts are not an array");
        return false;
    } else if (
        !tx.txOuts.map(isTxOutStructureValid).reduce((a, b) => a && b, true)
    ) {
        console.log("The structure of one of the txOut is not valid");
        return false;
    } else {
        return true;
    }
};

/**
 * Validate transaction INPUT with KEY
 * @param {TxIn} txIn:
 * @param {Transaction} tx:
 * @param uTxOutList
 * @returns {*}
 */
const validateTxIn = (txIn, tx, uTxOutList) => {
    const wantedTxOut = uTxOutList.find(
        uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
    );
    if (wantedTxOut === null) {
        console.log(`Didn't find the wanted uTxOut, the tx: ${tx} is invalid`);
        return false;
    } else {
        const address = wantedTxOut.address;
        const key = ec.keyFromPublic(address, "hex");
        return key.verify(tx.id, txIn.signature);
    }
};

/**
 * Validate transaction.
 * @param {Transaction} tx
 * @param {UTxOut[]} uTxOutList
 * @returns {boolean}
 */
const validateTx = (tx, uTxOutList) => {
    if (!isTxStructureValid(tx)) {
        console.log("Tx structure is invalid");
        return false;
    }

    if (getTxId(tx) !== tx.id) {
        console.log("Tx ID is not valid");
        return false;
    }

    const hasValidTxIns = tx.txIns.map(txIn =>
        validateTxIn(txIn, tx, uTxOutList)
    );

    if (!hasValidTxIns) {
        console.log(`The tx: ${tx} doesn't have valid txIns`);
        return false;
    }

    const amountInTxIns = tx.txIns
        .map(txIn => getAmountInTxIn(txIn, uTxOutList))
        .reduce((a, b) => a + b, 0);

    const amountInTxOuts = tx.txOuts
        .map(txOut => txOut.amount)
        .reduce((a, b) => a + b, 0);

    if (amountInTxIns !== amountInTxOuts) {
        console.log(
            `The tx: ${tx} doesn't have the same amount in the txOut as in the txIns`
        );
        return false;
    } else {
        return true;
    }
};

/**
 * Validate coinbase transaction
 * @param {Transaction} tx: Coinbase transaction.
 * @param {Number} blockIndex
 * @returns {boolean}
 */
const validateCoinbaseTx = (tx, blockIndex) => {
    if (getTxId(tx) !== tx.id) {
        console.log("Invalid Coinbase tx ID");
        return false;
    } else if (tx.txIns.length !== 1) {
        console.log("Coinbase TX should only have one input");
        return false;
    } else if (tx.txIns[0].txOutIndex !== blockIndex) {
        console.log(
            "The txOutIndex of the Coinbase Tx should be the same as the Block Index"
        );
        return false;
    } else if (tx.txOuts.length !== 1) {
        console.log("Coinbase TX should only have one output");
        return false;
    } else if (tx.txOuts[0].amount !== COINBASE_AMOUNT) {
        console.log(
            `Coinbase TX should have an amount of only ${COINBASE_AMOUNT} and it has ${
                tx.txOuts[0].amount
                }`
        );
        return false;
    } else {
        return true;
    }
};

const hasDuplicates = txIns => {
    const groups = _.countBy(txIns, txIn => txIn.txOutId + txIn.txOutIndex);

    return _(groups)
        .map(value => {
            if (value > 1) {
                console.log("Found a duplicated txIn");
                return true;
            } else {
                return false;
            }
        })
        .includes(true);
};

const validateBlockTxs = (txs, uTxOutList, blockIndex) => {
    const coinbaseTx = txs[0];
    if (!validateCoinbaseTx(coinbaseTx, blockIndex)) {
        console.log("Coinbase Tx is invalid");
    }

    const txIns = _(txs)
        .map(tx => tx.txIns)
        .flatten()
        .value();

    if (hasDuplicates(txIns)) {
        console.log("Found duplicated txIns");
        return false;
    }

    const nonCoinbaseTxs = txs.slice(1);

    return nonCoinbaseTxs
        .map(tx => validateTx(tx, uTxOutList))
        .reduce((a, b) => a + b, true);
};

module.exports = {
    validateTx,
    validateBlockTxs
};