pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/ownership/NoOwner.sol';
import '../NFTIndexer.sol';

/**
 * @title Indexable Non-Fungible Token Manager Standard
 * @dev Basic contract that will allow being indexed in NFTIndexer.
 */
contract IndexableNFTManager is NoOwner {

  NFTIndexer public nftIndexer;

  /**
   * @notice Constructor: Instantiate NFTManager contract
   * @dev Constructor function to provide NFTManager address and instantiate it.
   * @param _nftIndexer address of the NFTIndexer contract that wants to be
   * indexed in.
   */
  constructor(NFTIndexer _nftIndexer) public {
    require(_nftIndexer.isNFTIndexer() == true);
    nftIndexer = _nftIndexer;
  }

  /*
   * @notice Makes the contract type verifiable.
   * @dev Function to prove the contract is NFTManager.
   */
  function isNFTManager() external pure returns (bool) {
    return true;
  }

  /**
   * @notice Sets address of new NFTIndexer
   * @dev Will set a new NFTIndexer. It's important to note that all
   * changes done to previous NFTIndexer, will not affect the state of the new one.
   * So it may be needed to set some stuff again (uris, ownerships, etc).
   * @param _nftIndexer address of the NFTIndexer contract that wants to be
   * indexed in.
   */
  function setNFTIndexer(NFTIndexer _nftIndexer) external onlyOwner {
    require(_nftIndexer.isNFTIndexer() == true);
    nftIndexer = _nftIndexer;
  }

  /**
   * @notice Sets URI of a NFTType on a certain NFTContract
   * @dev Proxy call to NFTIndexer, so the msg.sender will be the NFTManager.
   * @param _nftContract the address of the NFTContract.
   * @param _nftType a bytes32 that represents the token type.
   * @param _uri string representing where the information of the token type
   * its allocated (IPFS).
   */
  function setNFTUri(address _nftContract, bytes32 _nftType, string _uri) external onlyOwner {
    nftIndexer.setNFTUri(_nftContract, _nftType, _uri);
  }

}
