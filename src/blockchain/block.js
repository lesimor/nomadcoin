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

const genesisTx = {
    txIns: [{signature: "", txOutId: "", txOutIndex: 0}],
    txOuts: [
        {
            address:
                "04f20aec39b4c5f79355c053fdaf30410820400bb83ad93dd8ff16834b555e0f6262efba6ea94a87d3c267b5e6aca433ca89b342ac95c40230349ea4bf9caff1ed",
            amount: 50
        }
    ],
    id: "ad67c73cd8e98af6db4ac14cc790664a890286d4b06c6da7ef223aef8c281e76"
};

const GENESIS_BLOCK = new Block(
    0,
    "82a3ecd4e76576fccce9999d560a31c7ad1faff4a3f4c6e7507a227781a8537f",
    "",
    1518512316,
    [genesisTx],
    0,
    0
);

module.exports = {
    Block,
    GENESIS_BLOCK
};