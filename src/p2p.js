const WebSockets = require("ws"),
  Blockchain = require("./blockchain");

const {
  getNewestBlock,
  isBlockStructureValid,
  replaceChain,
  getBlockchain,
  addBlockToChain
} = Blockchain;

const sockets = [];
const server_name = 'localhost:' + process.env.HTTP_PORT;

// Messages Types
const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators
const getLatest = () => {
  return {
    type: GET_LATEST,
    data: null
  };
};

const getAll = () => {
  return {
    type: GET_ALL,
    data: null
  };
};

const blockchainResponse = data => {
  return {
    type: BLOCKCHAIN_RESPONSE,
    data
  };
};

const getSockets = () => sockets;

/**
 * @param {Server} server
 *    Server started with port
 */
const startP2PServer = server => {
  // Create websocket server on the server.
  const wsServer = new WebSockets.Server({ server });
  wsServer.on("connection", ws => {
    initSocketConnection(ws);
  });
  console.log("Nomadcoin P2P Server running");
};

/**
 * Initialize socket connection with Websocket instance
 * @param {WebSockets} ws
 */
const initSocketConnection = ws => {
  // Add websocket to socket list.
  sockets.push(ws);

  // Add event of socket handling
  handleSocketMessages(ws);

  // Add event of error
  handleSocketError(ws);

  // Send message of latest block.
  sendMessage(ws, getLatest());
};

/**
 * Parse stringified json string to JSON
 * @param {String} data
 * @returns {Object} : Parsed json object.
 */
const parseData = data => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
    return null;
  }
};

/**
 * Set websocket handling event.
 * @param {WebSockets} ws
 */
const handleSocketMessages = ws => {
  ws.on("message", data => {
    const message = parseData(data);
    if (message === null) {
      return;
    }
    console.log(message);
    switch (message.type) {
      case GET_LATEST:
        sendMessage(ws, responseLatest());
        break;
      case GET_ALL:
        sendMessage(ws, responseAll());
        break;
      case BLOCKCHAIN_RESPONSE:
        const receivedBlocks = message.data;
        if (receivedBlocks === null) {
          break;
        }
        handleBlockchainResponse(receivedBlocks);
        break;
    }
  });
};

/**
 * Set block chain data handling event.
 * @param {list} receivedBlocks
 */
const handleBlockchainResponse = receivedBlocks => {
  if (receivedBlocks.length === 0) {
    console.log("Received blocks have a length of 0");
    return;
  }
  const latestBlockReceived = receivedBlocks[receivedBlocks.length - 1];
  if (!isBlockStructureValid(latestBlockReceived)) {
    console.log("The block structure of the block received is not valid");
    return;
  }
  // Newest block of this server.
  const newestBlock = getNewestBlock();
  if (latestBlockReceived.index > newestBlock.index) {
    if (newestBlock.hash === latestBlockReceived.previousHash) {
      if (addBlockToChain(latestBlockReceived)) {
        broadcastNewBlock();
      }
    } else if (receivedBlocks.length === 1) {
      sendMessageToAll(getAll());
    } else {
      replaceChain(receivedBlocks);
    }
  }
};

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

const sendMessageToAll = message =>
  sockets.forEach(ws => sendMessage(ws, message));

const responseLatest = () => blockchainResponse([getNewestBlock()]);

const responseAll = () => blockchainResponse(getBlockchain());

const broadcastNewBlock = () => sendMessageToAll(responseLatest());

/**
 * Set error handling event.
 * If the error occurred, the websocket server will be closed.
 * Deleted from socket list also.
 * @param {WebSockets} ws
 */
const handleSocketError = ws => {
  const closeSocketConnection = ws => {
    ws.close();
    sockets.splice(sockets.indexOf(ws), 1);
  };
  ws.on("close", () => closeSocketConnection(ws));
  ws.on("error", () => closeSocketConnection(ws));
};
/**
 * Connect to peer with websocket
 * @param {String} newPeer
 *    Server host name of the new peer
 */
const connectToPeers = newPeer => {
  const ws = new WebSockets(newPeer);
  ws.on("open", () => {
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers,
  broadcastNewBlock
};
