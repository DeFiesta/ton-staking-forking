require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: {
    version: "0.5.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/N-Gnpjy1WvCfokwj6fiOfuAVL_At6IvE",
        //blockNumber: 12345678 // Optional: specify a block number to fork from
      }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000
  }
};
