require("@nomiclabs/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-etherscan");

require("dotenv").config();

require("./tasks/deploy-exchange");
require("./tasks/deploy-transfer-proxies");
require("./tasks/deploy-erc20-test-tokens");
require("./tasks/deploy-nfts");


const {
  ACCOUNT_PK_1,
  ACCOUNT_PK_2,
} = process.env;

const {
  ETHERSCAN_API_KEY
} = process.env;

module.exports = {
  solidity: {
    version: "0.7.6",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    rinkeby: {
      chainId: 4,
      url: "https://eth-rinkeby.alchemyapi.io/v2/5gNmfCGyn5VQ1IQ_V-NwBVbXG5jCbhLK",
      accounts: [ACCOUNT_PK_1, ACCOUNT_PK_2],
      // gasMultiplier: 1.25,
      gasPrice: 20000000000,
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

