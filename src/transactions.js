const CryptoJS = require("crypto-js"),
  elliptic = require("elliptic"),
  utils = require("./utils");

const ec = new elliptic.ec("secp256k1");

const COINBASE_AMOUNT = 50;

class TxOut {
  constructor(address, amount) {
    // Destination address.
    this.address = address;

    // Amount of coins
    this.amount = amount;
  }
}

class TxIn {
  // txOutId
  // txOutIndex
  // Signature
}

class Transaction {
  // ID
  // txIns[]
  // txOuts[]
}

class UTxOut {
  constructor(txOutId, txOutIndex, address, amount) {
    this.txOutId = txOutId;
    this.txOutIndex = txOutIndex;
    this.address = address;
    this.amount = amount;
  }
}

let uTxOuts = [];

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
 * Sign on transaction input with private key.
 * @param {TxIn} tx : Target transaction input.
 * @param {Number} txInIndex : Target transaction index.
 * @param {String} privateKey : Private key to use for signing.
 * @param uTxOut
 * @returns {String|null} : Signature string.
 */
const signTxIn = (tx, txInIndex, privateKey, uTxOut) => {
  const txIn = tx.txIns[txInIndex];
  const dataToSign = tx.id;
  const referencedUTxOut = findUTxOut(txIn.txOutId, tx.txOutIndex, uTxOutList);
  if (referencedUTxOut === null) {
    console.log("Couldn't find the referenced uTxOut, not signing");
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
    .map(tx => {
      tx.txOuts.map((txOut, index) => {
        new UTxOut(tx.id, index, txOut.address, txOut.amount);
      });
    })
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

/*
[(), B, C, D, E, F, G, ZZ, MM]


A(40) ---> TRANSACTION  ----> ZZ(10)
                        ----> MM(30)
*/

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

const getAmountInTxIn = (txIn, uTxOutList) =>
  findUTxOut(txIn.txOutId, txIn.txOutIndex, uTxOutList).amount;

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

module.exports = {
  getPublicKey,
  getTxId,
  signTxIn,
  TxIn,
  Transaction,
  TxOut
};
