const WebSockets = require("ws"),
  Blockchain = require("./blockchain");

const { getLastBlock } = Blockchain;

const sockets = [];

// Messages Types
const GET_LATEST = "GET_LATEST";
const GET_ALL = "GET_ALL";
const BLOCKCHAIN_RESPONSE = "BLOCKCHAIN_RESPONSE";

// Message Creators START //
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
// Message Creators END //

const getSockets = () => sockets;

const startP2PServer = server => {
  const wsServer = new WebSockets.Server({ server });
  wsServer.on("connection", ws => {
    /**
     * 해당 서버에 이벤트 등록
     * connection => 다른 서버가 네트워크에 접속한 경우.
      */
    initSocketConnection(ws);
  });
  console.log("Nomadcoin P2P Server running");
};

/**
 * p2p 네트워크 socket 리스트에 새로운 socket을 추가.
 * @param socket
 */
const initSocketConnection = ws => {
  sockets.push(ws);
  handleSocketMessages(ws);
  handleSocketError(ws);
  sendMessage(ws, getLatest());
};

const parseData = data => {
  try {
    return JSON.parse(data);
  } catch (e) {
    console.log(e);
    return null;
  }
};

/**
 * 해당 webSocket에 이벤트 등록
 * @param ws
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
        sendMessage(ws, getLastBlock());
        break;
    }
  });
};

const sendMessage = (ws, message) => ws.send(JSON.stringify(message));

/**
 * 에러가 발생했을 경우 해당 socket을 닫고 socket 리스트에서 해당 socket을 제거.
 * @param ws: webSocket 객체
 */
const handleSocketError = ws => {
  const closeSocketConnection = ws => {
    ws.close();
    sockets.splice(sockets.indexOf(ws), 1);
  };
  /**
   * 이벤트 등록
   * close: 해당 socket을 닫은 경우
   * error: 해당 socket에서 에러 발생
   */
  ws.on("close", () => closeSocketConnection(ws));
  ws.on("error", () => closeSocketConnection(ws));
};

/**
 * 새로운 Peer와 연결
 * @param newPeer: websocket 주소 ex)ws://www.example.com
 */
const connectToPeers = newPeer => {
  const ws = new WebSockets(newPeer);
  ws.on("open", () => {
    initSocketConnection(ws);
  });
};

module.exports = {
  startP2PServer,
  connectToPeers
};
