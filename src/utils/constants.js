const {Block} = require("../block");

const GENESIS_TX = {
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
    [GENESIS_TX],
    0,
    0
);

const BLOCK_GENERATION_INTERVAL = 10;

const DIFFICULTY_ADJUSMENT_INTERVAL = 10;

const COINBASE_AMOUNT = 50;

module.exports = {
    GENESIS_BLOCK,
    BLOCK_GENERATION_INTERVAL,
    DIFFICULTY_ADJUSMENT_INTERVAL,
    COINBASE_AMOUNT
};