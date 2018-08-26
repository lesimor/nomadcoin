const hexToBinary = require("hex-to-binary");
const { createHash } = require("./utils");

class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }

    static findBlock (index, previousHash, timestamp, data, difficulty) {
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
            if (Block.hashMatchesDifficulty(hash, difficulty)) {
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

    static hashMatchesDifficulty(hash, difficulty = 0) {
        const hashInBinary = hexToBinary(hash);
        const requiredZeros = "0".repeat(difficulty);
        console.log("Trying difficulty:", difficulty, "with hash", hashInBinary);
        return hashInBinary.startsWith(requiredZeros);
    };

}

module.exports = {
    Block
};