const {createHash, getTimestamp} = require("./utils");

const isTimeStampValid = (newBlock, oldBlock) => {
    return (
        oldBlock.timestamp - 60 < newBlock.timestamp &&
        newBlock.timestamp - 60 < getTimestamp()
    );
};

const isBlockStructureValid = block => {
    return (
        typeof block.index === "number" &&
        typeof block.hash === "string" &&
        typeof block.previousHash === "string" &&
        typeof block.timestamp === "number" &&
        typeof block.data === "object"
    );
};

const isBlockValid = (candidateBlock, latestBlock) => {
    const candidateBlockHash = createHash(
        candidateBlock.index,
        candidateBlock.previousHash,
        candidateBlock.timestamp,
        candidateBlock.data,
        candidateBlock.difficulty,
        candidateBlock.nonce
    );
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
    } else if (candidateBlockHash !== candidateBlock.hash) {
        console.log("The hash of this block is invalid");
        return false;
    } else if (!isTimeStampValid(candidateBlock, latestBlock)) {
        console.log("The timestamp of this block is dodgy");
        return false;
    }
    return true;
};

module.exports = {
    isBlockValid,
    isBlockStructureValid
};