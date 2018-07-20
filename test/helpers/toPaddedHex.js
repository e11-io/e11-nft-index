module.exports = {
  toPaddedHex: (number) => {
    return '0x' + web3.padLeft(web3.toHex(number).substr(2), 64);
  }
};
