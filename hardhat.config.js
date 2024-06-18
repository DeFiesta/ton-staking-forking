require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.4",
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/N-Gnpjy1WvCfokwj6fiOfuAVL_At6IvE",
        //blockNumber: 12345678 // Optional: specify a block number to fork from
      }
    }
  }
};
