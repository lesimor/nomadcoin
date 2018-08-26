const { getBlocksHash, getTimestamp } = require("../util");
const { processTxs } = require("../../transactions")

/**
 * Check if adding blocks is allowed
 * @param candidateBlock
 * @param latestBlock
 * @returns {boolean}
 */
const isBlockValid = (candidateBlock, latestBlock) => {
    if (!isBlockStructureValid(candidateBlock)) {
        console.log("The candidate block structure is not valid");
        return false;
    } else if (latestBlock.index + 1 !== candidateBlock.index) {
        console.log("The candidate block doesnt have a valid index");
        return false;
    } else if (latestBlock.hash !== candidateBlock.previousHash) {
        console.log(
            "The previousHash of the candidate block is not the hash of the latest block"
        );
        return false;
    } else if (getBlocksHash(candidateBlock) !== candidateBlock.hash) {
        console.log("The hash of this block is invalid");
        return false;
    } else if (!isTimeStampValid(candidateBlock, latestBlock)) {
        console.log("The timestamp of this block is dodgy");
        return false;
    }
    return true;
};

/**
 * Check if the timestamp of new block is valid comparing previous block
 * @param {Block} newBlock
 * @param {Block} oldBlock
 * @returns {boolean}
 */
const isTimeStampValid = (newBlock, oldBlock) => {
    return (
        oldBlock.timestamp - 60 < newBlock.timestamp &&
        newBlock.timestamp - 60 < getTimestamp()
    );
};

/**
 * Check the types of block attributes
 * @param {Block} block
 * @returns {boolean}
 */
const isBlockStructureValid = block => {
    return (
        typeof block.index === "number" &&
        typeof block.hash === "string" &&
        typeof block.previousHash === "string" &&
        typeof block.timestamp === "number" &&
        typeof block.data === "object"
    );
};

/**
 * Check the whole chain validation.
 * @param {Block[]} candidateChain
 * @returns {boolean}
 */
const isChainValid = (candidateChain, myChain) => {
    const isGenesisValid = (a, b) => {
        return JSON.stringify(a) === JSON.stringify(b);
    };
    if (!isGenesisValid(candidateChain[0], myChain[0])) {
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

module.exports = {
    isBlockValid,
    isBlockStructureValid,
    isChainValid
};