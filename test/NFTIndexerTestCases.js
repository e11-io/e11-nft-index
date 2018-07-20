const MintableNFT = artifacts.require('MintableNFT');
const NFTIndexer = artifacts.require('NFTIndexer');
const NFTManager = artifacts.require('NFTManager');
const SampleToken = artifacts.require('SampleToken');
const NFTManagerMock = artifacts.require('NFTManagerMock');

const { assertRevert } = require('./helpers/assertThrow');
const { toPaddedHex } = require('./helpers/toPaddedHex');

const NFTIndexerCasesMock = require('../mocks/NFTIndexerCases.json');

contract('NFTIndexer', function (accounts) {

  let nftIndexer,
      aliceMintableNFT,
      aliceNFTManager,
      bobMintableNFT,
      bobNFTManager,
      carolNFT,
      carolNFTManager,
      georgeNFT,
      georgeNFTManager;

  const aliceNFTTypes = NFTIndexerCasesMock.alice.tokens.map(nft => nft.type);
  const aliceNFTQuantities = NFTIndexerCasesMock.alice.tokens.map(nft => nft.quantity);
  const aliceNFTURIs = NFTIndexerCasesMock.alice.tokens.map(nft => nft.uri);
  const bobNFTTypes = NFTIndexerCasesMock.bob.tokens.map(nft => nft.type);
  const bobNFTQuantities = NFTIndexerCasesMock.bob.tokens.map(nft => nft.quantity);
  const bobNFTURIs = NFTIndexerCasesMock.bob.tokens.map(nft => nft.uri);
  const carolNFTTypes = NFTIndexerCasesMock.carol.tokens.map(nft => nft.type);
  const carolNFTQuantities = NFTIndexerCasesMock.carol.tokens.map(nft => nft.quantity);
  const carolNFTURIs = NFTIndexerCasesMock.carol.tokens.map(nft => nft.uri);
  const georgeNFTTypes = NFTIndexerCasesMock.george.tokens.map(nft => nft.type);
  const georgeNFTQuantities = NFTIndexerCasesMock.george.tokens.map(nft => nft.quantity);
  const georgeNFTURIs = NFTIndexerCasesMock.george.tokens.map(nft => nft.uri);

  const ether = new web3.BigNumber(web3.toWei(1, 'ether'));

  const Alice = accounts[0];
  const Bob = accounts[1];
  const Carol = accounts[2];
  const George = accounts[3];
  const David = accounts[4];

  beforeEach(async () => {
    nftIndexer = await NFTIndexer.new({ from: Alice });
  });

  context('Case 1 - Basic MintableNFT', () => {

    /*
     *  Title: Case 1 - Basic Mintable NFT
     *  Description:
     *  Alice will create a mintableNFT with a 1 byte bit mask,
     *  create her NFTManager + add it to the NFTIndexer.
     */
     beforeEach(async () => {
       aliceMintableNFT = await MintableNFT.new(
         NFTIndexerCasesMock.alice.name,
         NFTIndexerCasesMock.alice.symbol,
         NFTIndexerCasesMock.alice.quantityMask,
         { from: Alice }
       );
       await aliceMintableNFT.setTokensQuantity(aliceNFTTypes, aliceNFTQuantities, { from: Alice });
       aliceNFTManager = await NFTManager.new(nftIndexer.address, { from: Alice });
       await nftIndexer.setNFTManager(aliceMintableNFT.address, aliceNFTManager.address, { from: Alice });
       await aliceNFTManager.setNFTTypeMask(
         aliceMintableNFT.address,
         NFTIndexerCasesMock.alice.quantityMask,
         { from: Alice }
       );
       await aliceNFTManager.setNFTUri(
         aliceMintableNFT.address,
         toPaddedHex(aliceNFTTypes[0]),
         aliceNFTURIs[0],
         { from: Alice }
       );
       await aliceMintableNFT.mint(David, aliceNFTTypes[0], { from: Alice });
     });

     it('Sets David\'s token of aliceMintable active correctly', async () => {
       const davidTokenOnAliceNFT = await aliceMintableNFT.tokenOfOwnerByIndex(David, 0);
       await aliceNFTManager.setNFTActive(aliceMintableNFT.address, davidTokenOnAliceNFT, { from: David });
       const isTokenActive = await aliceNFTManager.isTokenActive(David, aliceMintableNFT.address, davidTokenOnAliceNFT);
       assert.equal(isTokenActive, true, 'David token was not activated correctly');
     });

     context('Case 2 - Double MintableNFT', async () => {

       /*
        *  Title: Case 2 - Double MintableNFT
        *  Description:
        *  Bob will create a mintableNFT with a 31 byteMask (different from Alice)
        *  and create its NFTManager + add it to the NFTIndexer.
        *  Alice will add to her NFTManager Bob's NFTContract, with a 30 byteMask.
        */

       beforeEach(async () => {
         bobMintableNFT = await MintableNFT.new(
           NFTIndexerCasesMock.bob.name,
           NFTIndexerCasesMock.bob.symbol,
           NFTIndexerCasesMock.bob.quantityMask,
           { from: Bob }
         );
         await bobMintableNFT.setTokensQuantity(bobNFTTypes, bobNFTQuantities, { from: Bob });
         bobNFTManager = await NFTManager.new(nftIndexer.address, { from: Bob });
         await nftIndexer.setNFTManager(bobMintableNFT.address, bobNFTManager.address, { from: Bob });
         await bobNFTManager.setNFTTypeMask(
           bobMintableNFT.address,
           NFTIndexerCasesMock.bob.quantityMask,
           { from: Bob }
         );
         await bobNFTManager.setNFTUri(
           bobMintableNFT.address,
           toPaddedHex(bobNFTTypes[0]),
           bobNFTURIs[0],
           { from: Bob }
         );
         await bobMintableNFT.mint(David, bobNFTTypes[0], { from: Bob });
       });

       it('Sets David\'s token active of bobMintable active correctly', async () => {
         const davidTokenOnBobNFT = await bobMintableNFT.tokenOfOwnerByIndex(David, 0);
         await bobNFTManager.setNFTActive(bobMintableNFT.address, davidTokenOnBobNFT, { from: David });
         const isTokenActive = await bobNFTManager.isTokenActive(David, bobMintableNFT.address, davidTokenOnBobNFT);
         assert.equal(isTokenActive, true, 'David token was not activated correctly');
       });

       it('Sets David\'s token active of bobMintable on aliceManager active correctly', async () => {
         await aliceNFTManager.setNFTTypeMask(
           bobMintableNFT.address,
           NFTIndexerCasesMock.bob.quantityMask,
           { from: Alice }
         );
         await aliceNFTManager.setNFTUri(
           bobMintableNFT.address,
           toPaddedHex(bobNFTTypes[0]),
           'IPFS:BobsNFT:OnAliceManager',
           { from: Alice }
         );
         const davidTokenOnBobNFT = await bobMintableNFT.tokenOfOwnerByIndex(David, 0);

         // Sets David's token active of bobMintable on aliceManager
         await aliceNFTManager.setNFTActive(bobMintableNFT.address, davidTokenOnBobNFT, { from: David });

         const isDavidsTokenOnAliceActive = await aliceNFTManager.isTokenActive(David, bobMintableNFT.address, davidTokenOnBobNFT);
         const isDavidsTokenOnBobActive = await bobNFTManager.isTokenActive(David, bobMintableNFT.address, davidTokenOnBobNFT);

         assert.equal(isDavidsTokenOnBobActive, false, 'David\'s token on Bob NFT Manager should not be active');
         assert.equal(isDavidsTokenOnAliceActive, true, 'David\'s token on Alice NFT Manager should be active');
       });

       it('Sets David\'s token active of bobMintable on aliceManager (with different quantity mask) active correctly', async () => {
         await aliceNFTManager.setNFTTypeMask(
           bobMintableNFT.address,
           NFTIndexerCasesMock.bob.quantityMask - 1,
           { from: Alice }
         );
         await aliceNFTManager.setNFTUri(
           bobMintableNFT.address,
           toPaddedHex(bobNFTTypes[0] - 1),
           'IPFS:BobsNFT:OnAliceManager',
           { from: Alice }
         );
         const davidTokenOnBobNFT = await bobMintableNFT.tokenOfOwnerByIndex(David, 0);

         // Sets David's token active of bobMintable on aliceManager
         await aliceNFTManager.setNFTActive(bobMintableNFT.address, davidTokenOnBobNFT, { from: David });

         const typeOnBob = await bobNFTManager.getNFTTypeId(bobMintableNFT.address, davidTokenOnBobNFT, { from : David });
         const typeOnAlice = await aliceNFTManager.getNFTTypeId(bobMintableNFT.address, davidTokenOnBobNFT, { from : David });

         assert.notEqual(typeOnBob, typeOnAlice, 'Token type should be different');

         const isTokenActiveOnBob = await bobNFTManager.isTokenActive(David, bobMintableNFT.address, davidTokenOnBobNFT);
         const isTokenActiveOnAlice = await aliceNFTManager.isTokenActive(David, bobMintableNFT.address, davidTokenOnBobNFT);

         assert.equal(isTokenActiveOnBob, false, 'Token should not be active on bob\'s manager');
         assert.equal(isTokenActiveOnAlice, true, 'Token should be active on alice\'s manager');

       });

       context('SampleToken Coverage', async () => {
         let carolNFTHash0;
         beforeEach(async () => {
           carolNFT = await SampleToken.new(
             NFTIndexerCasesMock.carol.name,
             NFTIndexerCasesMock.carol.symbol,
             {from: Carol}
           );
           carolNFTHash0 = await carolNFT.stringToHash(carolNFTTypes[0], { from: Carol });
         });
         it('Should get empty string', async () => {
           let emptyHash = await carolNFT.stringToHash('', { from: Carol });
         })
         it('Should revert on setTokenTypeAndQuantity with quantity 0', async () => {
           await assertRevert(async () => {
             await carolNFT.setTokenTypeAndQuantity(carolNFTHash0, 0, { from: Carol });
           })
         })
         it('Should revert on setTokenTypeAndQuantity with already set type', async () => {
           await carolNFT.setTokenTypeAndQuantity(carolNFTHash0, 1, { from: Carol });
           await assertRevert(async () => {
             await carolNFT.setTokenTypeAndQuantity(carolNFTHash0, 1, { from: Carol });
           })
         })
         it('Should revert on mint with exceeded quantity', async () => {
           await carolNFT.setTokenTypeAndQuantity(carolNFTHash0, 1, { from: Carol });
           await carolNFT.mint(David, carolNFTHash0, { from: Carol });
           await assertRevert(async () => {
             await carolNFT.mint(David, carolNFTHash0, { from: Carol });
           })
         })

       })

       context('Case 3 - NFT Types mixes', async () => {

         /*
          *  Title: Case 3 - NFT Types mixes
          *  Description:
          *  Carol creates an NFTcontract with a weird way of grouping the NFTs,
          *  she creates its manager + add it to the NFTIndexer.
          *  Alice will register Carol's contract, and add it
          *  to the indexer.
          */

         beforeEach(async () => {
           carolNFT = await SampleToken.new(
             NFTIndexerCasesMock.carol.name,
             NFTIndexerCasesMock.carol.symbol,
             { from: Carol }
           );
           let carolNFTHash0 = await carolNFT.stringToHash(carolNFTTypes[0], { from: Carol });
           let carolNFTHash1 = await carolNFT.stringToHash(carolNFTTypes[1], { from: Carol });
           await carolNFT.setTokenTypeAndQuantity(carolNFTHash0, carolNFTQuantities[0], { from: Carol });
           await carolNFT.setTokenTypeAndQuantity(carolNFTHash1, carolNFTQuantities[1], { from: Carol });
           carolNFTManager = await NFTManager.new(nftIndexer.address, { from: Carol });
           await nftIndexer.setNFTManager(carolNFT.address, carolNFTManager.address, { from: Carol });
           await carolNFTManager.setNFTTypeMask(
             carolNFT.address,
             NFTIndexerCasesMock.carol.quantityMask,
             { from: Carol }
           );
           await carolNFTManager.setNFTUri(
             carolNFT.address,
             toPaddedHex(carolNFTTypes[0]),
             carolNFTURIs[0],
             { from: Carol }
           );

           await carolNFT.mint(David, carolNFTHash0, { from: Carol });
         });

         it('Sets David\'s token active of carol NFT on both carolManager and aliceManager active correctly', async () => {
           await aliceNFTManager.setNFTTypeMask(
             carolNFT.address,
             NFTIndexerCasesMock.carol.quantityMask,
             { from: Alice }
           );
           await aliceNFTManager.setNFTUri(
             carolNFT.address,
             toPaddedHex(carolNFTTypes[0]),
             'IPFS:CarolsNFT:OnAliceManager',
             { from: Alice }
           );
           const davidTokenOnCarolNFT = await carolNFT.tokenOfOwnerByIndex(David, 0);
           await carolNFTManager.setNFTActive(carolNFT.address, davidTokenOnCarolNFT, { from: David });
           await aliceNFTManager.setNFTActive(carolNFT.address, davidTokenOnCarolNFT, { from: David });

           const isTokenActiveOnCarol = await carolNFTManager.isTokenActive(David, carolNFT.address, davidTokenOnCarolNFT);
           const isTokenActiveOnAlice = await aliceNFTManager.isTokenActive(David, carolNFT.address, davidTokenOnCarolNFT);

           assert.equal(isTokenActiveOnCarol, true, 'Token should be active on carol\'s manager');
           assert.equal(isTokenActiveOnAlice, true, 'Token should be active on alice\'s manager');
         });

         context('Case 4 - NFT Managers mixes', async () => {
           /*
            *  Title: Case 4 - NFT Managers mixes
            *  Description:
            *  George creates an NFTcontract, and creates its manager with an
            *  specialized way of handling types. Then he adds it to the NFTIndexer.
            *  Alice will register George's contract, and add it to the indexer.
            */
            beforeEach(async() => {
              georgeNFT = await SampleToken.new(
                NFTIndexerCasesMock.george.name,
                NFTIndexerCasesMock.george.symbol,
                { from: George }
              );
              let georgeNFTHash0 = await georgeNFT.stringToHash(georgeNFTTypes[0], { from: George });
              let georgeNFTHash1 = await georgeNFT.stringToHash(georgeNFTTypes[1], { from: George });

              await georgeNFT.setTokenTypeAndQuantity(georgeNFTHash0, georgeNFTQuantities[0], { from: George });
              await georgeNFT.setTokenTypeAndQuantity(georgeNFTHash1, georgeNFTQuantities[1], { from: George });

              georgeNFTManager = await NFTManagerMock.new(nftIndexer.address, { from: George });
              await nftIndexer.setNFTManager(georgeNFT.address, georgeNFTManager.address, { from: George });
              await georgeNFTManager.setNFTTypeMask(
                georgeNFT.address,
                NFTIndexerCasesMock.george.quantityMask,
                { from: George }
              );
              await georgeNFTManager.setNFTUri(
                georgeNFT.address,
                toPaddedHex(georgeNFTTypes[0]),
                georgeNFTURIs[0],
                { from: George }
              );

              await georgeNFT.mint(David, georgeNFTHash0, { from: George });
            });

            it('getNFTTypeId of David\'s token on georgeNFT on aliceNFTManager should default to georgeNFTManager', async () => {
              const davidTokenOnGeorgeNFT = await georgeNFT.tokenOfOwnerByIndex(David, 0);
              const onAliceManager = await aliceNFTManager.getNFTTypeId(georgeNFT.address, davidTokenOnGeorgeNFT);
              const onGeorgeManager = await georgeNFTManager.getNFTTypeId(georgeNFT.address, davidTokenOnGeorgeNFT);

              assert.equal(
                onAliceManager,
                onGeorgeManager,
                'getNFTTypeId it\'s not defaulting correctly'
              );
            });

            it('getNFTTypeId of David\'s token on georgeNFT on aliceManager', async () => {
              await aliceNFTManager.setNFTTypeMask(
                georgeNFT.address,
                NFTIndexerCasesMock.george.quantityMask,
                { from: Alice }
              );
              await aliceNFTManager.setNFTUri(
                georgeNFT.address,
                toPaddedHex(georgeNFTTypes[0]),
                'IPFS:GeorgeNFT:OnAliceManager',
                { from: Alice }
              );
              const davidTokenOnGeorgeNFT = await georgeNFT.tokenOfOwnerByIndex(David, 0);
              const davidTokenOnGeorgeNFTHex = await georgeNFTManager.translateToBytes(davidTokenOnGeorgeNFT);

              const onAliceManager = await aliceNFTManager.getNFTTypeId(georgeNFT.address, davidTokenOnGeorgeNFT);

              assert.equal(
                onAliceManager.substr((onAliceManager.length / 2) + 1, onAliceManager.length - 1),
                davidTokenOnGeorgeNFTHex.substr(2, 32)
              );
            });
         });
       });
     });
  });
});
