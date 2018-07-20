const MintableNFT = artifacts.require("MintableNFT");
const NFTMinter = artifacts.require("NFTMinter");

const { assertRevert } = require('./helpers/assertThrow');

const mintableNFTMock = require('../mocks/MintableNFT');
contract('NFTMinter', function(accounts) {

  let mintableNFT;
  let nftMinter;

  const Alice = accounts[0];
  const Bob = accounts[1];
  const Carol = accounts[2];

  const wallet = Alice;
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const ether = new web3.BigNumber(web3.toWei(1, 'ether'));

  const tokenTypes = mintableNFTMock.tokens.map(token => token.type);
  const tokenPrices = mintableNFTMock.tokens.map(token => new web3.BigNumber(web3.toWei(token.price, 'ether')));
  const tokenQuantities = mintableNFTMock.tokens.map(token => token.quantity);

  const goldenSword = tokenTypes[0];
  const goldenSwordPrice = tokenPrices[0];
  const goldenSwordQuantity = tokenQuantities[0];
  const unicornBaloon = tokenTypes[1];
  const unicornBaloonPrice = tokenPrices[1];
  const unicornBaloonQuantity = tokenQuantities[1];

  it('New NFTMinter with non-MintableNFT should revert', async() => {
    await assertRevert(async () => {
      await NFTMinter.new(
        Alice,
        Bob
      );
    });
  });

  it('New NFTMinter with ZERO_ADDRESS wallet should revert', async() => {
    await assertRevert(async () => {
      await NFTMinter.new(
        ZERO_ADDRESS,
        mintableNFT.address
      );
    });
  });

  beforeEach(async () => {
    mintableNFT = await MintableNFT.new(
      mintableNFTMock.name,
      mintableNFTMock.symbol,
      mintableNFTMock.quantityMask
    );

    nftMinter = await NFTMinter.new(
      Carol,
      mintableNFT.address
    );
  })

  it('setTokenPrices by non-owner should revert', async() => {
    await assertRevert(async () => {
      await nftMinter.setTokenPrices([], [], { from: Bob });
    });
  });

  it('setTokenPrices by owner with invalid token should revert', async() => {
    await assertRevert(async () => {
      await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
    });
  });

  it('disableTokens by non-owner should revert', async() => {
    await assertRevert(async () => {
      await nftMinter.disableTokens([], { from: Bob });
    });
  });

  it('disableTokens by owner no tokens set should revert', async() => {
    await assertRevert(async () => {
      await nftMinter.disableTokens([goldenSword], { from: Alice });
    });
  });

  it('disableTokens by owner with empty tokens should revert', async() => {
    await assertRevert(async () => {
      await nftMinter.disableTokens([], { from: Alice });
    });
  });

  context('MintableNFT has tokens and nftMinter is minter', async () => {

    beforeEach(async () => {
      await mintableNFT.setTokensQuantity(tokenTypes, tokenQuantities, { from: Alice });
      await mintableNFT.setAuthorizedMinter(nftMinter.address, true, { from: Alice });
    });

    it('setTokenPrices with length 0 should revert', async() => {
      await assertRevert(async () => {
        await nftMinter.setTokenPrices([], [], { from: Alice });
      });
    });

    it('setTokenPrices with different lengths (price) should revert', async() => {
      await assertRevert(async () => {
        await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice, goldenSwordPrice], { from: Alice });
      });
    });

    it('setTokenPrices with different lengths (id) should revert', async() => {
      await assertRevert(async () => {
        await nftMinter.setTokenPrices([goldenSword, unicornBaloon], [goldenSwordPrice], { from: Alice });
      });
    });

    it('setTokenPrices by owner with valid token', async() => {
      await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      let price = await nftMinter.tokenTypePrices(goldenSword);
      assert.equal(price.equals(goldenSwordPrice), true, 'Price was not properly set');
      let enabledTokensLength = await nftMinter.getEnabledTokensLength.call();
      assert.equal(enabledTokensLength.equals(1), true, 'enabledTokensLength was properly set');
    });
    it('gets marketplace information', async () => {
      let [tokenTypes, tokenTypesPrices, tokenTypesQuantities, tokenTypesAvailableQuantities] = await nftMinter.getEnabledTokensInformation.call();
      assert.equal(tokenTypes.toString(), [].toString());
      assert.equal(tokenTypesPrices.toString(), [].toString());
      assert.equal(tokenTypesQuantities.toString(), [].toString());
      assert.equal(tokenTypesAvailableQuantities.toString(), [].toString());

      await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      [tokenTypes, tokenTypesPrices, tokenTypesQuantities, tokenTypesAvailableQuantities] = await nftMinter.getEnabledTokensInformation.call();
      assert.equal(tokenTypes.toString(), [goldenSword].toString());
      assert.equal(tokenTypesPrices.toString(), [goldenSwordPrice].toString());
      assert.equal(tokenTypesQuantities.toString(), [goldenSwordQuantity].toString());
      assert.equal(tokenTypesAvailableQuantities.toString(), [goldenSwordQuantity].toString());

      await nftMinter.setTokenPrices([unicornBaloon], [unicornBaloonPrice], { from: Alice });
      [tokenTypes, tokenTypesPrices, tokenTypesQuantities, tokenTypesAvailableQuantities] = await nftMinter.getEnabledTokensInformation.call();
      assert.equal(tokenTypes.toString(), [goldenSword, unicornBaloon].toString());
      assert.equal(tokenTypesPrices.toString(), [goldenSwordPrice, unicornBaloonPrice].toString());
      assert.equal(tokenTypesQuantities.toString(), [goldenSwordQuantity, unicornBaloonQuantity].toString());
      assert.equal(tokenTypesAvailableQuantities.toString(), [goldenSwordQuantity, unicornBaloonQuantity].toString());

      await nftMinter.buyTokens(unicornBaloon, { from: Alice, value: unicornBaloonPrice });
      [,,tokenTypesQuantities, tokenTypesAvailableQuantities] = await nftMinter.getEnabledTokensInformation.call();
      assert.equal(tokenTypesQuantities.toString(), [goldenSwordQuantity, unicornBaloonQuantity].toString());
      assert.equal(tokenTypesAvailableQuantities.toString(), [goldenSwordQuantity, (unicornBaloonQuantity - 1)].toString());
    });

    it('setTokenPrices by owner with valid token twice should revert', async() => {
      await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      let price = await nftMinter.tokenTypePrices(goldenSword);
      assert.equal(price.equals(goldenSwordPrice), true, 'Price was not properly set');
      await assertRevert(async () => {
        await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      });
    });

    it('disable and re-enable token', async() => {
      await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      let initial_price = await nftMinter.tokenTypePrices(goldenSword);
      assert.equal(initial_price.equals(goldenSwordPrice), true, 'Price was not properly set');

      await nftMinter.disableTokens([goldenSword]);

      let [enadbledTokensIds,,,] = await nftMinter.getEnabledTokensInformation.call();

      assert.equal(enadbledTokensIds.toString(), '');

      await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      let final_price = await nftMinter.tokenTypePrices(goldenSword);
      assert.equal(final_price.equals(goldenSwordPrice), true, 'Price was not properly set');
    });

    context('and has valid Token', async () => {

      beforeEach(async () => {
        await nftMinter.setTokenPrices([goldenSword], [goldenSwordPrice], { from: Alice });
      });

      it('disableTokens by owner with invalid token should revert', async() => {
        await assertRevert(async () => {
          await nftMinter.disableTokens([unicornBaloon], { from: Alice });
        });
      });

      it('disableTokens by owner with valid token', async() => {
        await nftMinter.disableTokens([goldenSword], { from: Alice });
        let enabled = await nftMinter.tokenEnabled(goldenSword);
        assert.equal(enabled, false, 'Token was not disabled');
      });

      it('disableTokens by owner with valid token twice should revert', async() => {
        await nftMinter.disableTokens([goldenSword], { from: Alice });

        await assertRevert(async () => {
          await nftMinter.disableTokens([goldenSword], { from: Alice });
        });
      });

      it('buyTokens invalid token should revert', async() => {
        await assertRevert(async () => {
          await nftMinter.buyTokens(unicornBaloon, { from: Alice, value: goldenSwordPrice });
        });
      });

      it('buyTokens not enough available tokens should revert', async() => {
        await nftMinter.buyTokens(goldenSword, { from: Alice, value: goldenSwordPrice });
        await assertRevert(async () => {
          await nftMinter.buyTokens(goldenSword, { from: Alice, value: goldenSwordPrice });
        });
      });

      it('buyTokens exceeded ether should revert', async() => {
        await assertRevert(async () => {
          await nftMinter.buyTokens(goldenSword, { from: Alice, value: goldenSwordPrice.plus(1) });
        });
      });

      it('buyTokens not enough ether should revert', async() => {
        await assertRevert(async () => {
          await nftMinter.buyTokens(goldenSword, { from: Alice, value: goldenSwordPrice.sub(1) });
        });
      });

      it('buyTokens sword', async() => {
        let carolInitialETH =  await web3.eth.getBalance(Carol);
        await nftMinter.buyTokens(goldenSword, { from: Bob, value: goldenSwordPrice });

        let newToken = await mintableNFT.tokenOfOwnerByIndex(Bob, 0);
        let ownerOfToken = await mintableNFT.ownerOf(newToken);
        assert.equal(ownerOfToken, Bob, 'Bob is not the owner of the token');

        let carolAfterBuyETH =  await web3.eth.getBalance(Carol);
        assert.equal(carolAfterBuyETH.equals(carolInitialETH.plus(goldenSwordPrice)), true, 'Carol did not receive the money');

        let weiRaised = await nftMinter.weiRaised.call();
        assert.equal(weiRaised.equals(goldenSwordPrice), true, 'weiRaised was not updated');
      });

      it('buyTokens baloons', async() => {
        let carolInitialETH =  await web3.eth.getBalance(Carol);
        await nftMinter.setTokenPrices([unicornBaloon], [unicornBaloonPrice], { from: Alice });

        await nftMinter.buyTokens(unicornBaloon, { from: Bob, value: unicornBaloonPrice});
        await nftMinter.buyTokens(unicornBaloon, { from: Bob, value: unicornBaloonPrice});
        await nftMinter.buyTokens(unicornBaloon, { from: Bob, value: unicornBaloonPrice});

        let newToken1 = await mintableNFT.tokenOfOwnerByIndex(Bob, 0);
        let newToken2 = await mintableNFT.tokenOfOwnerByIndex(Bob, 1);
        let newToken3 = await mintableNFT.tokenOfOwnerByIndex(Bob, 2);

        let ownerOfToken1 = await mintableNFT.ownerOf(newToken1);
        let ownerOfToken2 = await mintableNFT.ownerOf(newToken2);
        let ownerOfToken3 = await mintableNFT.ownerOf(newToken3);
        assert.equal(ownerOfToken1, Bob, 'Bob is not the owner of the token');
        assert.equal(ownerOfToken2, Bob, 'Bob is not the owner of the token');
        assert.equal(ownerOfToken3, Bob, 'Bob is not the owner of the token');

        let carolAfterBuyETH =  await web3.eth.getBalance(Carol);
        assert.equal(carolAfterBuyETH.equals(carolInitialETH.plus(unicornBaloonPrice.mul(3))), true, 'Carol did not receive the money');

        let weiRaised = await nftMinter.weiRaised.call();
        assert.equal(weiRaised.equals(unicornBaloonPrice.mul(3)), true, 'weiRaised was not updated');
      });

      it('get owned tokens', async () => {
        let carolInitialETH =  await web3.eth.getBalance(Carol);
        let amountToBuy = 3;
        let typesBought = [];
        await nftMinter.setTokenPrices([unicornBaloon], [unicornBaloonPrice], { from: Alice });

        for (var i = 0; i < amountToBuy; i++) {
          await nftMinter.buyTokens(unicornBaloon, { from: Bob, value: unicornBaloonPrice});
          typesBought[i] = unicornBaloon;
        }

        let tokens = await mintableNFT.getOwnedTokensIds.call(Bob);
        let bitsMask = await mintableNFT.bitsMask.call();

        tokenTypeIds = tokens.map(token => token.toNumber());

        let ownedTypesIds = [];
        let tokenTypeId;
        for (var i = 0; i < tokenTypeIds.length; i++) {
          tokenTypeId = web3.toHex(tokenTypeIds[i]); // Convert tokenId to Hex
          tokenTypeId = tokenTypeId.substring(0, tokenTypeId.length - (bitsMask/4)); // Removes Quantity mask
          tokenTypeId = web3.toDecimal(tokenTypeId) // Convert back to decimal

          ownedTypesIds[i] = tokenTypeId;
        }

        assert.equal(typesBought.toString(), ownedTypesIds.toString());
      })
    });
  });

});
