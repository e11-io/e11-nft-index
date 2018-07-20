pragma solidity ^0.4.23;

import '../manager/TokenableNFTManager.sol';
import '../manager/TypeableNFTManager.sol';

/**
 * @title NFTManagerMock
 * @dev NFTManagerMock is a Manager ERCXXX compliant.
 * This is a contract developed only for testing purposes,
 * do not use this smart contract for a production stage.
 * IMPORTANT: Not intended to be deployed on a mainnet.
 */

contract NFTManagerMock is TypeableNFTManager, TokenableNFTManager {

  constructor(NFTIndexer _nftIndexer) public TypeableNFTManager(_nftIndexer) TokenableNFTManager(_nftIndexer) {
  }

  function getNFTTypeId(Ownable _nftContract, uint256 _token) external view returns(bytes32 normalizedToken) {
    bytes32 leftNormalized = bytes32(_token) >> 24 * 8;
    leftNormalized = leftNormalized << 24 * 8;
    bytes32 rightNormalized = bytes32(_token) >> 16 * 8;
    rightNormalized = rightNormalized << 24 * 8;
    rightNormalized = rightNormalized >> 24 * 8;
    normalizedToken = (leftNormalized | rightNormalized);
  }

  function translateToBytes (uint256 _token) external view returns(bytes32 normalizedToken) {
    return bytes32(_token);
  }
}
