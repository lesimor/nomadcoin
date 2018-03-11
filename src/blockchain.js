const CryptoJS = require("crypto-js");

class Block {
  /**
   * 블록 체인을 구성하는 하나의 블록 단위
   * @param index: 해당 블록의 블록체인에서의 위치(Genesis block의 index는 0)
   * @param hash: 해당 블록이 갖고 있는 정보를 바탕으로 생성되는 hash값, 모든 블록마다 같은 hash화 로직이 적용
   * @param previousHash: 직전 블록의 hash값
   * @param timestamp: 블록이 생성된 시점
   * @param data: 해당 블록이 갖고 있는 데이터
   */
  constructor(index, hash, previousHash, timestamp, data) {
    this.index = index;
    this.hash = hash;
    this.previousHash = previousHash;
    this.timestamp = timestamp;
    this.data = data;
  }
}

/**
 * 블록 체인의 가장 첫번째 블록
 * @type {Block}
 */
const genesisBlock = new Block(
  0,
  "2C4CEB90344F20CC4C77D626247AED3ED530C1AEE3E6E85AD494498B17414CAC",
  null,
  1520312194926,
  "This is the genesis!!"
);

/**
 * 블록체인 global 변수, 앞으로의 모든 블록 수정은 이 변수를 통해 진행.
 * @type {[{Block}]}
 */
let blockchain = [genesisBlock];

/**
 * 블록체인의 가장 마지막 블록을 가져온다.
 */
const getLastBlock = () => blockchain[blockchain.length - 1];

/**
 * 블록이 생성되는 시즘의 TimeStamp 값을 생성하는 함수.
 */
const getTimestamp = () => new Date().getTime() / 1000;

/**
 * global 블록체인을 가져오는 함수
 */
const getBlockchain = () => blockchain;

/**
 * 블록이 가지고 있는 정보를 토대로 hash값을 생성하는 함수.
 * @param index: 해당 블록의 index
 * @param previousHash: 해당 블록의 previousHash
 * @param timestamp: 해당 블록의 timestamp
 * @param data: 해당 블록의 data
 */
const createHash = (index, previousHash, timestamp, data) =>
  CryptoJS.SHA256(
    index + previousHash + timestamp + JSON.stringify(data)
  ).toString();

/**
 * 새로운 블록을 생성하는 함수
 * @param data: 블록에 담고자 하는 정보
 * @returns {Block}
 */
const createNewBlock = data => {
  const previousBlock = getLastBlock();
  const newBlockIndex = previousBlock.index + 1;
  const newTimestamp = getTimestamp();
  const newHash = createHash(
    newBlockIndex,
    previousBlock.hash,
    newTimestamp,
    data
  );
  const newBlock = new Block(
    newBlockIndex,
    newHash,
    previousBlock.hash,
    newTimestamp,
    data
  );
  addBlockToChain(newBlock);
  return newBlock;
};

/**
 * 블록의 Hash값을 구하는 함수.
 * @param block
 */
const getBlocksHash = block =>
  createHash(block.index, block.previousHash, block.timestamp, block.data);

/**
 * 새로운 블록이 블록체인에 추가될 수 있는지 검증
 * @param candidateBlock: 블록체인에 추가하고자 하는 블록
 * @param latestBlock: 블록체인의 가장 마지막 블록
 * @returns {boolean}
 */
const isNewBlockValid = (candidateBlock, latestBlock) => {
  if (!isNewStructureValid(candidateBlock)) {
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
  }
  return true;
};

/**
 * 해당 블록이 갖고 있는 각 attribute의 integrity 검증.
 * @param block: 검증하고자 하는 블록
 * @returns {boolean}
 */
const isNewStructureValid = block => {
  return (
    typeof block.index === "number" &&
    typeof block.hash === "string" &&
    typeof block.previousHash === "string" &&
    typeof block.timestamp === "number" &&
    typeof block.data === "string"
  );
};

/**
 * 블록체인의 전체 구조 검증, Genesis block부터 마지막 블록까지 chain을 검증.
 * @param candidateChain: 검증 대상이 되는 체인
 * @returns {boolean}
 */
const isChainValid = candidateChain => {
  const isGenesisValid = block => {
    return JSON.stringify(block) === JSON.stringify(genesisBlock);
  };
  if (!isGenesisValid(candidateChain[0])) {
    console.log(
      "The candidateChains's genesisBlock is not the same as our genesisBlock"
    );
    return false;
  }
  for (let i = 1; i < candidateChain.length; i++) {
    if (!isNewBlockValid(candidateChain[i], candidateChain[i - 1])) {
      return false;
    }
  }
  return true;
};

/**
 * 여러 체인 중에 길이가 더 긴 체인으로 대체
 * @param candidateChain: 교체하고자 하는 체인
 * @returns {boolean}
 */
const replaceChain = candidateChain => {
  if (
    isChainValid(candidateChain) &&
    candidateChain.length > getBlockchain().length
  ) {
    blockchain = candidateChain;
    return true;
  } else {
    return false;
  }
};

/**
 * 블록 체인에 새로운 블록을 추가
 * @param candidateBlock: 추가하고자 하는 블록
 * @returns {boolean}
 */
const addBlockToChain = candidateBlock => {
  if (isNewBlockValid(candidateBlock, getLastBlock())) {
    getBlockchain().push(candidateBlock);
    return true;
  } else {
    return false;
  }
};

module.exports = {
  getLastBlock,
  getBlockchain,
  createNewBlock
};
