const _ = require("lodash"),
    transaction_validators = require("./utils/validators/transaction_validator");

const {validateTx, isTxValidForPool} = transaction_validators;

let mempool = [];

const getMempool = () => _.cloneDeep(mempool);

/**
 * Check if the transaction input is in unspent transaction outputs
 * @param {TxIn} txIn
 * @param {UTxOut[]} uTxOutList
 * @returns {boolean}
 */
const hasTxIn = (txIn, uTxOutList) => {
    const foundTxIn = uTxOutList.find(
        uTxO => uTxO.txOutId === txIn.txOutId && uTxO.txOutIndex === txIn.txOutIndex
    );

    return foundTxIn !== undefined;
};

/**
 * Filter transactions which is not in unspent transaction outputs
 * @param {UTxOut[]} uTxOutList
 */
const updateMempool = uTxOutList => {
    const invalidTxs = [];

    for (const tx of mempool) {
        for (const txIn of tx.txIns) {
            if (!hasTxIn(txIn, uTxOutList)) {
                invalidTxs.push(tx);
                break;
            }
        }
    }

    if (invalidTxs.length > 0) {
        mempool = _.without(mempool, ...invalidTxs);
    }
};

/**
 * Add transaction to mempool
 * @param {Transaction} tx: Transaction to add
 * @param {UTxOut[]} uTxOutList
 */
const addToMempool = (tx, uTxOutList) => {
    if (!validateTx(tx, uTxOutList)) {
        throw Error("This tx is invalid. Will not add it to pool");
    } else if (!isTxValidForPool(tx, mempool)) {
        throw Error("This tx is not valid for the pool. Will not add it.");
    }
    mempool.push(tx);
};

module.exports = {
    addToMempool,
    getMempool,
    updateMempool
};
