const MintableNFT = artifacts.require('MintableNFT');
const NFTIndexer = artifacts.require('NFTIndexer');
const NFTManager = artifacts.require('NFTManager');

const { assertRevert, assertInvalidOpcode } = require('./helpers/assertThrow');
const { toPaddedHex } = require('./helpers/toPaddedHex');

const mintableNFTMock = require('../mocks/MintableNFT');
contract('NFTIndexer', function(accounts) {

  let mintableNFT;
  let nftIndexer;
  let nftManager;

  const Alice = accounts[0];
  const Bob = accounts[1];
  const Carol = accounts[2];

  const wallet = Alice;

  const ether = new web3.BigNumber(web3.toWei(1, 'ether'));

  const nftTypes = mintableNFTMock.tokens.map(nft => nft.type);
  const nftPrices = mintableNFTMock.tokens.map(nft => new web3.BigNumber(web3.toWei(nft.price, 'ether')));
  const nftQuantities = mintableNFTMock.tokens.map(nft => nft.quantity);

  const goldenSword = nftTypes[0];
  const goldenSwordPrice = nftPrices[0];
  const goldenSwordQuantity = nftQuantities[0];
  const goldenSwordURI = 'IPFS:Sample-uri';
  const unicornBaloon = nftTypes[1];
  const unicornBaloonURI = 'IPFS:Sample-u(nicorn)ri';

  beforeEach(async () => {

    mintableNFT = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      mintableNFTMock.quantityMask
    );

    nftIndexer = await NFTIndexer.new({ from: Alice });

    nftManager = await NFTManager.new(nftIndexer.address, { from: Alice });
  });

  it('nftIndexer should be nftIndexer type', async() => {
    const isNFTIndexer = await nftIndexer.isNFTIndexer();
    assert.equal(isNFTIndexer, true, 'NFTIndexer was not isNFTIndexer type');
  });

  it('nftIndexer owner should be Alice', async() => {
    const owner = await nftIndexer.owner.call();
    assert.equal(owner, Alice, 'Owner was not properly set');
  });

  it('setNFTManager with non NFTContract should revert', async() => {
    await assertRevert(async () => {
      await nftIndexer.setNFTManager(Bob, nftManager.address);
    });
  });

  it('setNFTManager with non NFTManager should revert', async() => {
    await assertRevert(async () => {
      await nftIndexer.setNFTManager(mintableNFT.address, Bob);
    });
  });

  it('setNFTManager when NFTManager has a different NFTIndexer should revert', async() => {
    nftIndexer2 = await NFTIndexer.new({ from: Alice });
    nftManager2 = await NFTManager.new(nftIndexer2.address, { from: Alice });

    await assertRevert(async () => {
      await nftIndexer.setNFTManager(mintableNFT.address, nftManager2.address);
    });
  });

  it('setNFTManager when having ownership of the NFTIndexer and not ownership of NFTContract should revert', async() => {
    const mintableNFT2 = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      mintableNFTMock.quantityMask,
      { from: Bob }
    );
    await assertRevert(async () => {
      await nftIndexer.setNFTManager(mintableNFT2.address, nftManager.address);
    });
  });

  it('setNFTManager', async() => {
    await nftIndexer.setNFTManager(mintableNFT.address, nftManager.address);
    const NFTManager = await nftIndexer.nftManager(mintableNFT.address);
    assert.equal(NFTManager, nftManager.address, 'NFTManager was not properly set');
  });

  it('setNFTUri via non-NFTManager should revert', async() => {
    await assertRevert(async () => {
      await nftIndexer.setNFTUri(mintableNFT.address, toPaddedHex(goldenSword), goldenSwordURI);
    });
  });

  it('setNFTUri with empty uri should revert', async() => {
    await assertRevert(async () => {
      await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(goldenSword), '');
    });
  });

  it('setNFTUri should receive well hashed integers', async() => {
    await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(1), '1');
    await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(256), '256');

    const indexedNFT = await nftIndexer.indexedNFTs(mintableNFT.address, 0);
    const indexedNFT1 = await nftIndexer.indexedNFTs(mintableNFT.address, 1);
    const uri1 = await nftIndexer.uri(mintableNFT.address, toPaddedHex(1), nftManager.address);
    const uri256 = await nftIndexer.uri(mintableNFT.address, toPaddedHex(256), nftManager.address);

    assert.equal(uri1, '1', 'URI was not properly set');
    assert.equal(uri256, '256', 'URI was not properly set');
  });

  it('setNFTUri should revert when receiving bad hashed integers', async() => {
    await nftManager.setNFTUri(mintableNFT.address, 1, '1');
    await nftManager.setNFTUri(mintableNFT.address, 256, '256');

    const indexedNFT = await nftIndexer.indexedNFTs(mintableNFT.address, 0);
    // Only 1 record is being set since the hex value 256 overwrites the hex value 1
    await assertInvalidOpcode(async () => {
      const indexedNFT1 = await nftIndexer.indexedNFTs(mintableNFT.address, 1);
    });
    const uri1 = await nftIndexer.uri(mintableNFT.address, 1, nftManager.address);
    // uri1 has been overwritten with '256'
    assert.equal(uri1, '256', 'URI was not properly set');

  });
  it('setNFTUri', async() => {
    await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(goldenSword), goldenSwordURI);
    await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(unicornBaloon), goldenSwordURI);
    await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(unicornBaloon), unicornBaloonURI);
    const uri = await nftIndexer.uri(mintableNFT.address, toPaddedHex(goldenSword), nftManager.address);
    const indexedNFTContract = await nftIndexer.indexedNFTContracts(0);
    const indexedNFT = await nftIndexer.indexedNFTs(mintableNFT.address, 0);
    const indexedNFTManager = await nftIndexer.indexedNFTManagers(mintableNFT.address, toPaddedHex(goldenSword), 0);
    const indexedNFTManagersLength = await nftIndexer.getIndexedNFTManagersLength(mintableNFT.address, toPaddedHex(goldenSword));

    assert.equal(indexedNFTContract, mintableNFT.address, 'mintableNFT was not added in indexedNFTContracts');
    assert.equal(indexedNFT, goldenSword, 'goldenSword was not added in indexedNFTs');
    assert.equal(indexedNFTManager, nftManager.address, 'nftManager was not added in indexedNFTManagers');
    assert.equal(indexedNFTManagersLength, 1, 'indexedNFTManagersLength was not properly set');
    assert.equal(uri, goldenSwordURI, 'URI was not properly set');
  });

});
