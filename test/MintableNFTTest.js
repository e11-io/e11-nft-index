const MintableNFT = artifacts.require("MintableNFT");

const { assertRevert } = require('./helpers/assertThrow');

const mintableNFTMock = require('../mocks/MintableNFT');

contract('MintableNFT', function(accounts) {

  let mintableNFT;

  const Alice = accounts[0];
  const Bob = accounts[1];
  const Carol = accounts[2];

  const wallet = Alice;

  const ether = new web3.BigNumber(web3.toWei(1, 'ether'));

  const tokenTypes = mintableNFTMock.tokens.map(token => token.type);
  const tokenQuantities = mintableNFTMock.tokens.map(token => token.quantity);

  const goldenSword = tokenTypes[0];
  const goldenSwordQuantity = tokenQuantities[0];

  it('New MintableNFT with exceeded quantityMask', async() => {
    await assertRevert(async () => {
      await MintableNFT.new(
        mintableNFTMock.name,
        mintableNFTMock.symbol,
        32
      );
    });
  });

  it('New MintableNFT with zero quantityMask', async() => {
    await assertRevert(async () => {
      await MintableNFT.new(
        mintableNFTMock.name,
        mintableNFTMock.symbol,
        0
      );
    });
  });

  it('New MintableNFT with correct bitesMask and maxMask', async() => {
    mintableNFT = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      mintableNFTMock.quantityMask
    );
    let maxMask = await mintableNFT.maxMask.call();
    assert.equal(maxMask, Math.pow(2, mintableNFTMock.quantityMask * 8));
  });

  it('New MintableNFT doesnt overflow the bitmask', async() => {
    const maxPossibleQuantityBytes = 31;
    mintableNFT = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      maxPossibleQuantityBytes
    );
    const bitsMask = await mintableNFT.maxMask.call();
    const maxBitMask = (new web3.BigNumber(2)).pow(maxPossibleQuantityBytes * 8).sub(1);
    expect(bitsMask.eq(maxBitMask), 'Bitmask may have overflown').to.be.true;
  })

  beforeEach(async () => {
    mintableNFT = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      mintableNFTMock.quantityMask
    );
  })

  it('isMintableNFT', async() => {
    let isMintableNFT = await mintableNFT.isMintableNFT();
    assert.equal(isMintableNFT, true, 'is not isMintableNFT');
  });

  it('setAuthorizedMinter by non-owner should revert', async() => {
    await assertRevert(async () => {
      await mintableNFT.setAuthorizedMinter(Bob, true, { from: Bob });
    });
  });

  it('setAuthorizedMinter by owner', async() => {
    await mintableNFT.setAuthorizedMinter(Bob, true, { from: Alice });

    let isAuthorized = await mintableNFT._authorizedMinters(Bob);
    assert.equal(isAuthorized, true, '_authorizedMinter was not set');
  });

  it('setAuthorizedMinter by owner to false', async() => {
    await mintableNFT.setAuthorizedMinter(Bob, true, { from: Alice });
    await mintableNFT.setAuthorizedMinter(Bob, false, { from: Alice });

    let isAuthorized = await mintableNFT._authorizedMinters(Bob);
    assert.equal(isAuthorized, false, '_authorizedMinter was not re-set');
  });


  it('setTokensQuantity by non-owner should revert', async() => {
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Bob });
    });
  });

  it('setTokensQuantity by owner with length 0 should revert', async() => {
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity([], [], { from: Alice });
    });
  });

  it('setTokensQuantity by owner with different length should revert', async() => {
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity([1], [0,1], { from: Alice });
    });
  });

  it('setTokensQuantity by owner with quantity 0 should revert', async() => {
    // Sets to 0 all quantities
    let brokenTokenQuantities = tokenQuantities.map(quantity => 0);
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, brokenTokenQuantities, { from: Alice });
    });
  });

  it('setTokensQuantity by owner with quantity > maxMask should revert', async() => {
    let maxMask = await mintableNFT.maxMask.call();
    // Sets to maxMask + 1 all quantities
    let overflowTokenQuantities = tokenQuantities.map(quantity => maxMask.plus(1));
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, overflowTokenQuantities, { from: Alice });
    });
  });

  it('setTokensQuantity by owner with overflowed tokenType should revert', async() => {
    // Sets id 1 to the max fittable type number and adds 1 to trigger the overflow byte shifting check
    let brokenTokenTypes = tokenTypes.map(type => type == 1 ?
      new web3.BigNumber(2).pow((32 - mintableNFTMock.quantityMask) * 8).plus(1):type
    );
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity(brokenTokenTypes, tokenQuantities, { from: Alice });
    });
  });

  it('setTokensQuantity by owner with overflowed typeId', async() => {
    let token1 = 1;
    let token2 = 2 ** 8;
    await mintableNFT.setTokensQuantity([token1], [1], { from: Alice });
    await mintableNFT.setTokensQuantity([token2], [2], { from: Alice });

    let tokenQuantity1 = await mintableNFT.tokenTypeQuantity(token1);
    let tokenQuantity2 = await mintableNFT.tokenTypeQuantity(token2);
    assert.equal(tokenQuantity1.toNumber(), 1, 'tokenQuantity was not properly set');
    assert.equal(tokenQuantity2.toNumber(), 2, 'tokenQuantity was not properly set');
  });

  it('setTokensQuantity by owner', async() => {
    await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });

    for (let i = 0; i < tokenTypes.length; i++) {
      tokenQuantity = await mintableNFT.tokenTypeQuantity(tokenTypes[i]);
      assert.equal(tokenQuantity.toNumber(), tokenQuantities[i], 'tokenQuantity was not properly set');
    }
  });

  it('setTokensQuantity by owner twice should revert', async() => {
    await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });

    for (let i = 0; i < tokenTypes.length; i++) {
      tokenQuantity = await mintableNFT.tokenTypeQuantity(tokenTypes[i]);
      assert.equal(tokenQuantity.toNumber(), tokenQuantities[i], 'tokenQuantity was not properly set');
    }
    await assertRevert(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });
    });
  });

  context('MintableNFT has tokens and Bob is minter', async () => {
    beforeEach(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });
      await mintableNFT.setAuthorizedMinter(Bob, true, { from: Alice });
    })

    it('mint by owner should not revert', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Alice });
    });

    it('mint by non-minter should revert', async() => {
      await assertRevert(async () => {
        await mintableNFT.mint(Carol, goldenSword, { from: Carol });
      });
    });

    it('mint by minter when paused should revert', async() => {
      await mintableNFT.pause();
      let paused = await mintableNFT.paused.call();
      assert.equal(paused, true, 'mintableNFT was not paused');
      await assertRevert(async () => {
        await mintableNFT.mint(Alice, goldenSword, { from: Bob });
      });
    });

    it('mint by minter', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Bob });
      let ownedTokensCount = await mintableNFT.balanceOf(Alice);
      assert.equal(ownedTokensCount, 1, 'Invalid amount of owned tokens by Alice');
      let newToken = await mintableNFT.tokenOfOwnerByIndex(Alice, 0);
      let newTokenHex = web3.toHex(newToken);
      let newTokenHexQuantityId = newTokenHex.substring(newTokenHex.length - mintableNFTMock.quantityMask * 2);
      assert.equal(web3.toDecimal(newTokenHexQuantityId), 1, 'Token quantityId should be 1');
      let ownerOfToken = await mintableNFT.ownerOf(newToken);
      let tokenQuantity = await mintableNFT.tokenTypeAvailableQuantity(goldenSword);

      assert.equal(tokenQuantity, goldenSwordQuantity - 1, 'Token quantity should have been reduced by 1');
      assert.equal(ownerOfToken, Alice, 'Alice is not the owner of the new token');
    });

    it('mint by minter exceeded quantity should revert', async() => {
      await mintableNFT.mint(Alice, goldenSword, { from: Bob });
      await assertRevert(async () => {
        await mintableNFT.mint(Alice, goldenSword, { from: Bob });
      });
    });
  });

});
