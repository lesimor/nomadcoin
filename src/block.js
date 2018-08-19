class Block {
    constructor(index, hash, previousHash, timestamp, data, difficulty, nonce) {
        /**
         * Block that makes up a chain
         * @param {Number} index
         * @param {String} hash
         * @param {String} previousHash
         * @param {Number} timestamp
         * @param {String} data
         * @param {Number} difficulty
         * @param {Number} nonce
         */
        this.index = index;
        this.hash = hash;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

module.exports = {
    Block
};