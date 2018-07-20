pragma solidity ^0.4.23;

import './manager/TokenableNFTManager.sol';
import './manager/TypeableNFTManager.sol';

/**
 * @title Non-Fungible Token Manager Standard
 * @dev NFTManager is a standard contract that will allow at its basis being
 * indexed in the NFTIndexer and basic non-fungible token interoperatibility.
 * Furthermore, it will allow tracking of active nft's per user, and getters
 * of the types based on bitmask shifting (modifiable by each implementation).
 */
contract NFTManager is TypeableNFTManager, TokenableNFTManager {

  constructor(NFTIndexer _nftIndexer) public TypeableNFTManager(_nftIndexer) TokenableNFTManager(_nftIndexer) {
  }

}
