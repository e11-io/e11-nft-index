let mainnetProvider, ropstenProvider;

if (!process.env.SOLIDITY_COVERAGE && !process.env.SOLIDITY_TEST) {
  var PrivateKeyProvider = require('truffle-privatekey-provider');
  const deployConfig = require('./mocks/deploy-config');

  mainnetProvider = new PrivateKeyProvider(deployConfig.mainnet.privateKey, deployConfig.mainnet.endpoint);
  ropstenProvider = new PrivateKeyProvider(deployConfig.ropsten.privateKey, deployConfig.ropsten.endpoint);
}

let exportConfig = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 7000000,
      network_id: "*"
    },
    mainnet: {
      provider: mainnetProvider,
      gasPrice: 10000000000,
      network_id: "1"
    },
    ropsten: {
      provider: ropstenProvider,
      gasPrice: 10000000000,
      network_id: "3"
    },
    ganache: {
      host: "localhost",
      port: 8345,
      gas: 7000000,
      network_id: "*"
    },
    coverage: {
      host: "localhost",
      network_id: "*",
      port: 8355,         // <-- Use port 8555
      gas: 0xfffffffffff, // <-- Use this high gas value
      gasPrice: 0x01      // <-- Use this low gas price
    }
  },
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  }
};

if (!process.env.SOLIDITY_COVERAGE && !process.env.SOLIDITY_TEST) {
  exportConfig.mocha = {
    reporter: 'eth-gas-reporter',
    reporterOptions : {
      currency: 'USD',
    }
  };
}

module.exports = exportConfig;
