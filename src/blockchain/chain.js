const _ = require("lodash");

const {
    getBalance,
    getPublicFromWallet,
    createTx,
    getPrivateFromWallet
} = require("../wallet/wallet");

const {createCoinbaseTx, processTxs} = require("../transaction/transactions");

const {addToMempool, getMempool, updateMempool} = require("../transaction/memPool");

const {isBlockValid} = require("./validator");

const {getTimestamp, sumDifficulty} = require("./utils");

const {Block, GENESIS_BLOCK} = require("./block");

const BLOCK_GENERATION_INTERVAL = 10;
const DIFFICULTY_ADJUSMENT_INTERVAL = 10;

let blockchain = [GENESIS_BLOCK];

let uTxOuts = processTxs(blockchain[0].data, [], 0);

const getNewestBlock = () => blockchain[blockchain.length - 1];

const getBlockchain = () => blockchain;

const createNewBlock = () => {
    const coinbaseTx = createCoinbaseTx(
        getPublicFromWallet(),
        getNewestBlock().index + 1
    );
    const blockData = [coinbaseTx].concat(getMempool());
    return createNewRawBlock(blockData);
};

const createNewRawBlock = data => {
    const previousBlock = getNewestBlock();
    const newBlockIndex = previousBlock.index + 1;
    const newTimestamp = getTimestamp();
    const difficulty = findDifficulty();
    const newBlock = Block.findBlock(
        newBlockIndex,
        previousBlock.hash,
        newTimestamp,
        data,
        difficulty
    );
    addBlockToChain(newBlock);
    require("../p2p").broadcastNewBlock();
    return newBlock;
};

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


// TODO: split validation and foreign UTx handler
const isChainValid = candidateChain => {
    const isGenesisValid = block => {
        return JSON.stringify(block) === JSON.stringify(GENESIS_BLOCK);
    };
    if (!isGenesisValid(candidateChain[0])) {
        console.log(
            "The candidateChains's genesisBlock is not the same as our genesisBlock"
        );
        return null;
    }

    let foreignUTxOuts = [];

    for (let i = 0; i < candidateChain.length; i++) {
        const currentBlock = candidateChain[i];
        if (i !== 0 && !isBlockValid(currentBlock, candidateChain[i - 1])) {
            return null;
        }

        foreignUTxOuts = processTxs(
            currentBlock.data,
            foreignUTxOuts,
            currentBlock.index
        );

        if (foreignUTxOuts === null) {
            return null;
        }
    }
    return foreignUTxOuts;
};


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
        require("../p2p").broadcastNewBlock();
        return true;
    } else {
        return false;
    }
};

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

const sendTx = (address, amount) => {
    const tx = createTx(
        address,
        amount,
        getPrivateFromWallet(),
        getUTxOutList(),
        getMempool()
    );
    addToMempool(tx, getUTxOutList());
    require("../p2p").broadcastMempool(); // <--- new line
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
    handleIncomingTx,
    getUTxOutList
};
