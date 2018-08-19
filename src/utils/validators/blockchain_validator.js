const { getBlocksHash, getTimestamp } = require("../util");
const { GENESIS_BLOCK } = require("../constants");

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
const isChainValid = candidateChain => {
    // Inner function to check genesis block
    const isGenesisValid = block => {
        return JSON.stringify(block) === JSON.stringify(GENESIS_BLOCK);
    };

    // Check genesis block.
    if (!isGenesisValid(candidateChain[0])) {
        console.log(
            "The candidateChains's genesisBlock is not the same as our genesisBlock"
        );
        return false;
    }

    // Check block validation consequently.
    for (let i = 1; i < candidateChain.length; i++) {
        if (!isBlockValid(candidateChain[i], candidateChain[i - 1])) {
            return false;
        }
    }
    return true;
};

module.exports = {
    isBlockValid,
    isBlockStructureValid,
    isChainValid
};