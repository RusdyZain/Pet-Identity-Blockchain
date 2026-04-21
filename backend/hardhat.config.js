require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

const {
  SEPOLIA_RPC_URL,
  // GOERLI_RPC_URL,
  DEPLOYER_PRIVATE_KEY,
  // GANACHE_RPC_URL,
  // GANACHE_CHAIN_ID,
  // BESU_CLIQUE_RPC_URL,
  // BESU_CLIQUE_CHAIN_ID,
} = process.env;

const deployerAccounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    // PoS testnet deployments
    sepolia: {
      url: SEPOLIA_RPC_URL || '',
      chainId: 11155111,
      accounts: deployerAccounts,
    },
    // goerli: {
    //   url: GOERLI_RPC_URL || '',
    //   chainId: 5,
    //   accounts: deployerAccounts,
    // },
    // PoA local deployments
    // ganache: {
    //   url: GANACHE_RPC_URL || 'http://127.0.0.1:7545',
    //   chainId: Number(GANACHE_CHAIN_ID || 1337),
    //   accounts: deployerAccounts,
    //   gas: 8_000_000,
    //   gasPrice: 2_000_000_000,
    // },
    // besuClique: {
    //   url: BESU_CLIQUE_RPC_URL || 'http://127.0.0.1:8545',
    //   chainId: Number(BESU_CLIQUE_CHAIN_ID || 1337),
    //   accounts: deployerAccounts,
    //   gas: 8_000_000,
    //   gasPrice: 0,
    // },
  },
};
