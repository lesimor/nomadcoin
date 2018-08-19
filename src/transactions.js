const CryptoJS = require("crypto-js"),
    elliptic = require("elliptic"),
    _ = require("lodash"),
    utils = require("./utils/util"),
    transaction_validators = require("./utils/validators/transaction_validator");

const ec = new elliptic.ec("secp256k1");

const {validateTx, validateBlockTxs} = transaction_validators;

const {getTxId, findUTxOut} = utils;

const {COINBASE_AMOUNT} = require("./utils/constants");

class UTxOut {
    constructor(txOutId, txOutIndex, address, amount) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}

class TxIn {
    constructor() {
        this.txOutId = '';
        this.txOutIndex = 0;
        this.signature = "";
    }
}

class Transaction {
    constructor() {
        this.id = '';
        this.txIns = [];
        this.txOuts = [];
    }

    /**
     * Create coinbase transaction
     * @param {String} address
     * @param {Number} blockIndex
     * @returns {Transaction}
     */
    static createCoinbaseTx(address, blockIndex) {
        const tx = new Transaction();
        const txIn = new TxIn();
        txIn.signature = "";
        txIn.txOutId = "";
        txIn.txOutIndex = blockIndex;
        tx.txIns = [txIn];
        tx.txOuts = [new TxOut(address, COINBASE_AMOUNT)];
        tx.id = getTxId(tx);
        return tx;
    };
}

class TxOut {
    constructor(address, amount) {
        this.address = address; // Destination address.
        this.amount = amount;  // Amount of coins
    }
}

let uTxOuts = [];

/**
 * Sign on transaction input with private key.
 * @param {TxIn} tx : Target transaction input.
 * @param {Number} txInIndex : Target transaction index.
 * @param {String} privateKey : Private key to use for signing.
 * @param uTxOutList
 * @returns {String|null} : Signature string.
 */
const signTxIn = (tx, txInIndex, privateKey, uTxOutList) => {
    const txIn = tx.txIns[txInIndex];
    const dataToSign = tx.id;
    const referencedUTxOut = findUTxOut(
        txIn.txOutId,
        txIn.txOutIndex,
        uTxOutList
    );
    if (referencedUTxOut === null || referencedUTxOut === undefined) {
        throw Error("Couldn't find the referenced uTxOut, not signing");
        return;
    }
    const referencedAddress = referencedUTxOut.address;
    if (getPublicKey(privateKey) !== referencedAddress) {
        return false;
    }
    const key = ec.keyFromPrivate(privateKey, "hex");
    const signature = utils.toHexString(key.sign(dataToSign).toDER());
    return signature;
};

/**
 * Get public key from private key.
 * @param privateKey
 * @returns {String}
 */
const getPublicKey = privateKey => {
    return ec
        .keyFromPrivate(privateKey, "hex")
        .getPublic()
        .encode("hex");
};

/**
 * Update unspent transactions with new transactions
 * @param {Transaction[]} newTxs : New transactions
 * @param {UTxOut[]} uTxOutList : Unspent transaction output list.
 * @returns {UTxOut[]}
 */
const updateUTxOuts = (newTxs, uTxOutList) => {
    // Create unspent transactions with new transactions' outputs.
    // To be added on global uTxOutList
    const newUTxOuts = newTxs
        .map(tx =>
            tx.txOuts.map(
                (txOut, index) => new UTxOut(tx.id, index, txOut.address, txOut.amount)
            )
        )
        .reduce((a, b) => a.concat(b), []);

    // All txIns of new transactions => Unspent transactions
    // To remove splitted UTxOut from uTxOutList
    const spentTxOuts = newTxs
        .map(tx => tx.txIns)
        .reduce((a, b) => a.concat(b), [])
        .map(txIn => new UTxOut(txIn.txOutId, txIn.txOutIndex, "", 0));

    // Remove previous unspent transaction
    const resultingUTxOuts = uTxOutList
        .filter(uTxO => !findUTxOut(uTxO.txOutId, uTxO.txOutIndex, spentTxOuts))
        .concat(newUTxOuts);
    return resultingUTxOuts;
};

/**
 * Validate transactions and updated uTxOutList
 * @param txs
 * @param uTxOutList
 * @param blockIndex
 * @returns {*}
 */
const processTxs = (txs, uTxOutList, blockIndex) => {
    if (!validateBlockTxs(txs, uTxOutList, blockIndex)) {
        return null;
    }
    return updateUTxOuts(txs, uTxOutList);
};

module.exports = {
    getPublicKey,
    signTxIn,
    TxIn,
    Transaction,
    TxOut,
    processTxs,
    validateTx
};
