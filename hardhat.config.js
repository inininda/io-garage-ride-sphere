require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@openzeppelin/hardhat-upgrades");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();
require("hardhat/types").HttpNetworkUserConfig;
const yargs = require("yargs");

const argv = yargs
  .option("network", {
    type: "string",
    default: "hardhat",
  })
  .help(false)
  .version(false).argv;

const {
  GOERLI_PRIVATE_KEY,
  INFURA_KEY,
  MNEMONIC,
  ETHERSCAN_API_KEY,
  PK,
  REPORT_GAS,
} = process.env;

const DEFAULT_MNEMONIC =
  ""; // please change

const sharedNetworkConfig = (HttpNetworkUserConfig = {});
if (PK) {
  sharedNetworkConfig.accounts = [PK];
} else {
  sharedNetworkConfig.accounts = {
    mnemonic: MNEMONIC || DEFAULT_MNEMONIC,
  };
}

// if (["rinkeby", "mainnet"].includes(argv.network) && INFURA_KEY === undefined) {
//   throw new Error(
//     `Could not find Infura key in env, unable to connect to network ${argv.network}`
//   );
// }

if (["goerli"].includes(argv.network) && GOERLI_PRIVATE_KEY === undefined) {
  throw new Error(
    `Could not find Alchemy Goerli key in env, unable to connect to network ${argv.network}`
  );
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",

  networks: {
    hardhat: {},
    mainnet: {
      ...sharedNetworkConfig,
      url: `https://mainnet.infura.io/v3/${INFURA_KEY}`,
    },
    ganache: {
      url: "http://127.0.0.1:7545/",
      saveDeployments: true,
    },
    goerli: {
      ...sharedNetworkConfig,
      // url: `https://goerli.infura.io/v3/${INFURA_KEY}`,
      url: `https://eth-goerli.g.alchemy.com/v2/${GOERLI_PRIVATE_KEY}`,
    },
    rinkeby: {
      ...sharedNetworkConfig,
      url: `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  namedAccounts: {
    deployer: 0,
  },
  mocha: {
    timeout: 2000000,
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
    goerli: ETHERSCAN_API_KEY,
  },
  gasReporter: {
    enabled: REPORT_GAS === "true" ? true : false,
    currency: "USD",
    gasPrice: 71,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
};
