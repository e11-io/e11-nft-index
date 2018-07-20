const MintableNFT = artifacts.require('MintableNFT');
const NFTIndexer = artifacts.require('NFTIndexer');
const NFTManager = artifacts.require('NFTManager');

const { assertRevert } = require('./helpers/assertThrow');
const { toPaddedHex } = require('./helpers/toPaddedHex');

const mintableNFTMock = require('../mocks/MintableNFT');
contract('NFTManager', function(accounts) {

  let mintableNFT;
  let nftIndexer;
  let nftManager;

  const Alice = accounts[0];
  const Bob = accounts[1];
  const Carol = accounts[2];

  const wallet = Alice;

  const ether = new web3.BigNumber(web3.toWei(1, 'ether'));

  const tokenTypes = mintableNFTMock.tokens.map(token => token.type);
  const tokenPrices = mintableNFTMock.tokens.map(token => new web3.BigNumber(web3.toWei(token.price, 'ether')));
  const tokenQuantities = mintableNFTMock.tokens.map(token => token.quantity);

  const goldenSword = tokenTypes[0];
  const goldenSwordPrice = tokenPrices[0];
  const goldenSwordQuantity = tokenQuantities[0];
  const goldenSwordURI = 'IPFS:Sample-uri';
  const unicornBaloon = tokenTypes[1];
  const unicornBaloonPrice = tokenPrices[1];
  const unicornBaloonQuantity = tokenQuantities[1];

  it('nftManager constructor with invalid NFTIndexer should revert', async() => {
    await assertRevert(async () => {
      await NFTManager.new(Alice, { from: Alice });
    });
  });

  beforeEach(async () => {
    mintableNFT = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      mintableNFTMock.quantityMask
    );

    nftIndexer = await NFTIndexer.new({ from: Alice });

    nftManager = await NFTManager.new(nftIndexer.address, { from: Alice });
  });

  it('nftManager should be nftManager type', async() => {
    const isNFTManager = await nftManager.isNFTManager();
    assert.equal(isNFTManager, true, 'NFTIndexer was not isNFTManager type');
  });

  it('nftManager owner should be Alice', async() => {
    const owner = await nftManager.owner.call();
    assert.equal(owner, Alice, 'Owner was not properly set');
  });

  it('nftManager nftIndexer should be nftIndexer', async() => {
    const nftIndexerAddress = await nftManager.nftIndexer();
    assert.equal(nftIndexerAddress, nftIndexer.address, 'NFTIndexer was not properly set');
  });

  it('setNFTIndexer should change nftIndexer', async () => {
    const nftIndexer2 = await NFTIndexer.new({ from: Alice });
    await nftManager.setNFTIndexer(nftIndexer2.address);
    const nftIndexerAddress = await nftManager.nftIndexer();
    assert.notEqual(nftIndexerAddress, nftIndexer.address, 'NFTIndexer was not properly updated');
    assert.equal(nftIndexerAddress, nftIndexer2.address, 'NFTIndexer was not properly updated');
  });

  it('setNFTIndexer should not allow to change nftIndexer if not provided with an NFTIndexer', async() => {
    await assertRevert(async () => {
      await nftManager.setNFTIndexer(Bob, { from: Alice });
    });
  });

  it('setNFTIndexer should not allow to change nftIndexer if not an owner', async() => {
    const nftIndexer2 = await NFTIndexer.new({ from: Alice });
    await assertRevert(async () => {
      await nftManager.setNFTIndexer(nftIndexer2.address, { from: Bob });
    });
  });

  it('setNFTTypeMask with max uint8 value should give 0', async() => {
    const quantityMask = 2 ** 8;
    await nftManager.setNFTTypeMask(mintableNFT.address, quantityMask);
    const bitsMask = await nftManager.bitsMask.call(mintableNFT.address);
    assert.equal(bitsMask.toNumber(), 0, 'bitsMask was not properly set');
  });

  it('setNFTTypeMask with uint8 overflowed value should give overflowed value', async() => {
    const addedValue = 1;
    const quantityMask = 2 ** 8 + addedValue;
    await nftManager.setNFTTypeMask(mintableNFT.address, quantityMask);
    const bitsMask = await nftManager.bitsMask.call(mintableNFT.address);
    assert.equal(bitsMask.toNumber(), addedValue * 8, 'bitsMask was not properly set');
  });

  it('setNFTTypeMask to 0', async() => {
    const quantityMask = 0;
    await nftManager.setNFTTypeMask(mintableNFT.address, quantityMask);
    const bitsMask = await nftManager.bitsMask.call(mintableNFT.address);
    assert.equal(bitsMask.toNumber(), quantityMask * 8, 'bitsMask was not properly set');
  });

  it('setNFTTypeMask to 1 byte', async() => {
    const quantityMask = 1;
    await nftManager.setNFTTypeMask(mintableNFT.address, quantityMask);
    const bitsMask = await nftManager.bitsMask.call(mintableNFT.address);
    assert.equal(bitsMask.toNumber(), quantityMask * 8, 'bitsMask was not properly set');
  });

  it('setNFTTypeMask to 32 bytes should revert', async() => {
    const quantityMask = 32;
    await assertRevert(async () => {
      await nftManager.setNFTTypeMask(mintableNFT.address, quantityMask);
    });
  });

  context('With token types & token quantities', async () => {
    beforeEach(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });
    });

    it('setNFTUri without ownership should revert', async () => {
      await assertRevert(async () => {
        await nftManager.setNFTUri(mintableNFT.address, toPaddedHex(goldenSword), 'IPFS:Sample-uri', { from: Bob });
      });
    });

    it('setNFTActive when msg.sender is not owner of token should revert', async() => {
      const notOwnedToken = 999;
      await assertRevert(async () => {
        await nftManager.setNFTActive(mintableNFT.address, notOwnedToken);
      });
    });

    it('setNFTActive when already active should revert', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      const index = await nftManager.activeNFTIndex(Alice, mintableNFT.address, newToken);
      await nftManager.setNFTActive(mintableNFT.address, newToken);
      await assertRevert(async () => {
        await nftManager.setNFTActive(mintableNFT.address, newToken);
      });
    });

    it('setNFTActive', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      await nftManager.setNFTActive(mintableNFT.address, newToken);
      const activeContractIndex = await nftManager.activeNFTContractsIndex(Alice, mintableNFT.address);
      const activeContract = await nftManager.activeNFTContracts(Alice, activeContractIndex);
      const activeNFTIndex = await nftManager.activeNFTIndex(Alice, mintableNFT.address, newToken);
      const activeNFT = await nftManager.activeNFTs(Alice, mintableNFT.address, activeNFTIndex);

      const active = await nftManager.isTokenActive(Alice, mintableNFT.address, newToken);

      assert.equal(activeContract, mintableNFT.address, 'nftContract was not properly set as active');
      assert.equal(activeNFT.equals(newToken), true, 'NFT was not properly set as active');

      assert.equal(active, true, 'NFT was not properly set as active');
    });

    it('isTokenActive recognize when an active token was transfered', async () => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      await nftManager.setNFTActive(mintableNFT.address, newToken);
      let active = await nftManager.isTokenActive(Alice, mintableNFT.address, newToken);
      assert.equal(active, true, 'NFT was not properly set as active');
      // console.log('\n\n', await mintableNFT.ownerOf(newToken), '\n\n');
      await mintableNFT.transferFrom(Alice, Bob, newToken);

      active = await nftManager.isTokenActive(Alice, mintableNFT.address, newToken);
      assert.equal(active, false, 'NFT was not properly detected as transfered');
    });

    it('removeActiveNFT when token is not active should revert', async() => {
      const notOwnedToken = 999;
      await assertRevert(async () => {
        await nftManager.removeActiveNFT(mintableNFT.address, notOwnedToken);
      });
    });

    it('removeActiveNFT', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      await nftManager.setNFTActive(mintableNFT.address, newToken);
      await nftManager.removeActiveNFT(mintableNFT.address, newToken);
      const active = await nftManager.isTokenActive(Alice, mintableNFT.address, newToken);

      assert.equal(active, false, 'NFT was not properly removed');
    });

    it('removeActiveNFT when it is not the last one', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      await mintableNFT.mint(Alice, unicornBaloon, { from: Alice });
      const newToken0 = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      const newToken1 = await mintableNFT.tokenOfOwnerByIndex(Alice, 1);
      await nftManager.setNFTActive(mintableNFT.address, newToken0);
      await nftManager.setNFTActive(mintableNFT.address, newToken1);
      await nftManager.removeActiveNFT(mintableNFT.address, newToken0);
      const active = await nftManager.isTokenActive(Alice, mintableNFT.address, newToken0);

      assert.equal(active, false, 'NFT was not properly removed');
    });

    it('removeActiveNFT when nftContract it is not the last one', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken0 = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);

      // Create a new mintableNFT fot this specific test
      const mintableNFT2 = await MintableNFT.new(mintableNFTMock.name, mintableNFTMock.symbol, mintableNFTMock.quantityMask);
      await mintableNFT2.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });
      await mintableNFT2.mint(Alice, goldenSword, { from: Alice });
      const newToken1 = await mintableNFT2.tokenOfOwnerByIndex(Alice, 0);

      await nftManager.setNFTActive(mintableNFT.address, newToken0);
      await nftManager.setNFTActive(mintableNFT2.address, newToken1);
      await nftManager.removeActiveNFT(mintableNFT.address, newToken0);
      const active = await nftManager.isTokenActive(Alice, mintableNFT.address, newToken0);
      const activeNFTContract = await nftManager.activeNFTContracts(Alice, 0);
      assert.equal(active, false, 'NFT was not properly removed');
      assert.equal(activeNFTContract, mintableNFT2.address, 'NFT Contract was not properly removed');
    });

    it('getNFTTypeId', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      await nftManager.setNFTTypeMask(mintableNFT.address, mintableNFTMock.quantityMask);
      let nftTypeId = await nftManager.getNFTTypeId(mintableNFT.address, newToken, { from: Alice });
      nftTypeId = new web3.BigNumber(nftTypeId);
      assert.equal(nftTypeId.equals(goldenSword), true, 'NFT TypeId was not properly parsed');
    });

    it('getNFTTypeId with no NFT Type Mask set', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      let nftTypeId = await nftManager.getNFTTypeId(mintableNFT.address, newToken, { from: Alice });
      nftTypeId = new web3.BigNumber(nftTypeId);
      assert.equal(nftTypeId.equals(newToken), true, 'NFT TypeId was not properly parsed');
    });

    it('getNFTTypeId using remote NFT Indexer contract', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
      const newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);

      // Setup new NFTManager and add it to the NFTIndexer
      nftManager2 = await NFTManager.new(nftIndexer.address, { from: Alice });
      await nftManager2.setNFTTypeMask(mintableNFT.address, mintableNFTMock.quantityMask);
      await nftIndexer.setNFTManager(mintableNFT.address, nftManager2.address);

      let nftTypeId = await nftManager.getNFTTypeId(mintableNFT.address, newToken, { from: Alice });
      nftTypeId = new web3.BigNumber(nftTypeId);
      assert.equal(nftTypeId.equals(goldenSword), true, 'NFT TypeId was not properly parsed');
    });
  });
});
