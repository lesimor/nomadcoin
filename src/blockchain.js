const _ = require("lodash"),
    Wallet = require("./wallet"),
    Mempool = require("./mempool"),
    Transactions = require("./transactions"),
    blockchain_validators = require("./utils/validators/blockchain_validator"),
    utils = require("./utils/util"),
    constants = require("./utils/constants"),
    block = require("./block"),
    hexToBinary = require("hex-to-binary");

const {Block} = block;
const {
    getBalance,
    getPublicFromWallet,
    createTx,
    getPrivateFromWallet
} = Wallet;

const {Transaction, processTxs} = Transactions;

const {addToMempool, getMempool, updateMempool} = Mempool;
const {isBlockValid, isChainValid} = blockchain_validators;

const {createHash, getTimestamp} = utils;

const {GENESIS_BLOCK, BLOCK_GENERATION_INTERVAL, DIFFICULTY_ADJUSMENT_INTERVAL} = constants;

// Block chain array
let blockchain = [GENESIS_BLOCK];

let uTxOuts = processTxs(blockchain[0].data, [], 0);

// Get the most recently added blocks
const getNewestBlock = () => blockchain[blockchain.length - 1];

// Get block chain
const getBlockchain = () => blockchain;

/**
 * Create new block with coinbase transaction
 * @returns {Block}
 */
const createNewBlock = () => {
    const coinbaseTx = Transaction.createCoinbaseTx(
        getPublicFromWallet(),
        getNewestBlock().index + 1
    );
    const blockData = [coinbaseTx].concat(getMempool());
    return createNewRawBlock(blockData);
};

/**
 * Create new block with data
 * @param {Object} data
 * @returns {Block}
 */
const createNewRawBlock = data => {
    const previousBlock = getNewestBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimestamp();
    const difficulty = findDifficulty();
    const newBlock = findBlock(
        newBlockIndex,
        previousBlock.hash,
        newTimestamp,
        data,
        difficulty
    );
    addBlockToChain(newBlock);
    require("./p2p").broadcastNewBlock();
    return newBlock;
};

/**
 * Find difficulty of the block
 * @returns {Number}
 */
const findDifficulty = () => {
    const newestBlock = getNewestBlock();
    if (
        newestBlock.index % DIFFICULTY_ADJUSMENT_INTERVAL === 0 &&
        newestBlock.index !== 0
    ) {
        return calculateNewDifficulty(newestBlock, getBlockchain());
    } else {
        return newestBlock.difficulty;
    }
};

/**
 * Find difficulty of the block
 * @param {Block} newestBlock
 * @param {Block[]} blockchain
 * @returns {Number}
 */
const calculateNewDifficulty = (newestBlock, blockchain) => {
    const lastCalculatedBlock =
        blockchain[blockchain.length - DIFFICULTY_ADJUSMENT_INTERVAL];
    const timeExpected =
        BLOCK_GENERATION_INTERVAL * DIFFICULTY_ADJUSMENT_INTERVAL;
    const timeTaken = newestBlock.timestamp - lastCalculatedBlock.timestamp;
    if (timeTaken < timeExpected / 2) {
        return lastCalculatedBlock.difficulty + 1;
    } else if (timeTaken > timeExpected * 2) {
        return lastCalculatedBlock.difficulty - 1;
    } else {
        return lastCalculatedBlock.difficulty;
    }
};

/**
 * Mine blocks with proof of work
 * @param {Number} index
 * @param {String} previousHash
 * @param {String} timestamp
 * @param {Object} data
 * @param {Number} difficulty
 * @returns {Block}
 */
const findBlock = (index, previousHash, timestamp, data, difficulty) => {
    let nonce = 0;
    while (true) {
        console.log("Current nonce", nonce);
        const hash = createHash(
            index,
            previousHash,
            timestamp,
            data,
            difficulty,
            nonce
        );
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(
                index,
                hash,
                previousHash,
                timestamp,
                data,
                difficulty,
                nonce
            );
        }
        nonce++;
    }
};

/**
 * Get whether to find proper hash with zeros of difficulty
 * @param {String} hash
 * @param {Number} difficulty
 * @returns {Boolean}
 */
const hashMatchesDifficulty = (hash, difficulty) => {
    const hashInBinary = hexToBinary(hash);
    const requiredZeros = "0".repeat(difficulty);
    console.log("Trying difficulty:", difficulty, "with hash", hashInBinary);
    return hashInBinary.startsWith(requiredZeros);
};

/**
 * Sum all difficulty of blocks in blockchain
 * @param {Block[]} anyBlockchain
 * @returns {Number}
 */
const sumDifficulty = anyBlockchain =>
    anyBlockchain
        .map(block => block.difficulty)
        .map(difficulty => Math.pow(2, difficulty))
        .reduce((a, b) => a + b);

/**
 * Replace the old chain with the new one.
 * @param {Block[]} candidateChain
 * @returns {boolean}
 */
const replaceChain = candidateChain => {
    const foreignUTxOuts = isChainValid(candidateChain);
    const validChain = foreignUTxOuts !== null;
    if (
        validChain &&
        sumDifficulty(candidateChain) > sumDifficulty(getBlockchain())
    ) {
        blockchain = candidateChain;
        uTxOuts = foreignUTxOuts;
        updateMempool(uTxOuts);
        require("./p2p").broadcastNewBlock();
        return true;
    } else {
        return false;
    }
};

/**
 * Add new block on the chain.
 * @param {Block} candidateBlock: Candidate block to add
 * @returns {boolean}
 */
const addBlockToChain = candidateBlock => {
    if (isBlockValid(candidateBlock, getNewestBlock())) {
        const processedTxs = processTxs(
            candidateBlock.data,
            uTxOuts,
            candidateBlock.index
        );
        if (processedTxs === null) {
            console.log("Couldnt process txs");
            return false;
        } else {
            blockchain.push(candidateBlock);
            uTxOuts = processedTxs;
            updateMempool(uTxOuts);
            return true;
        }
        return true;
    } else {
        return false;
    }
};

const getUTxOutList = () => _.cloneDeep(uTxOuts);

const getAccountBalance = () => getBalance(getPublicFromWallet(), uTxOuts);

/**
 * Create sending transation
 * @param {String} address: Target address
 * @param {Number} amount
 */
const sendTx = (address, amount) => {
    const tx = createTx(
        address,
        amount,
        getPrivateFromWallet(),
        getUTxOutList(),
        getMempool()
    );
    addToMempool(tx, getUTxOutList());
    require("./p2p").broadcastMempool(); // <--- new line
    return tx;
};

const handleIncomingTx = tx => {
    addToMempool(tx, getUTxOutList()); // <-- new line
};

module.exports = {
    getNewestBlock,
    getBlockchain,
    createNewBlock,
    addBlockToChain,
    replaceChain,
    getAccountBalance,
    sendTx,
    handleIncomingTx
};
