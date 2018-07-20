pragma solidity ^0.4.23;

import './IndexableNFTManager.sol';
import '../NFTIndexer.sol';

/**
 * @title Typeable Non-Fungible Token Manager Standard
 * @dev Extended Indexable NFT Manager, will allow the handling of token types
 * on an NFTManager.
 */
contract TypeableNFTManager is IndexableNFTManager {

  // nftContract => bitsMask
  mapping (address => uint8) public bitsMask;

  constructor(NFTIndexer _nftIndexer) public IndexableNFTManager(_nftIndexer) {
  }

  /**
   * @notice Sets the bytes mask of an NFTContract.
   * @dev Sets the bytes mask of an NFTContract. Will be used to normalize
   * the token at getNFTTypeId.
   * @param _nftContract the address of the NFTContract.
   * @param _quantityMask uint8 bytes that will be used to shift.
   */
  function setNFTTypeMask(address _nftContract, uint8 _quantityMask) external onlyOwner {
    require(_quantityMask < 32);
    bitsMask[_nftContract] = _quantityMask * 8; // (max 248 bits, fits on uint8(256))
  }

   /**
    * @notice Gets the type id of a token
    * @dev Gets the type id of a token on an NFTContract. This filter is based on
    * shifting bits.
    * @param _nftContract the address of the NFTContract.
    * @param _token token to get the type of.
    */
  function getNFTTypeId(Ownable _nftContract, uint256 _token) external view returns(bytes32 normalizedToken) {
    // We set up normalizedToken to return _token as a defualt.
    normalizedToken = bytes32(_token);
    // Search bit mask of NFT Contract
    uint8 contractMask = bitsMask[_nftContract];
    // There are two options, we have setted up a bit mask for the NFT contract
    // or we did not have a bitmask setted up for the NFT contract
    // If we did not, then let's ask the NFTManager that owns the NFT Contract
    // the type of the token.
    if (contractMask != 0) {
      normalizedToken = normalizedToken >> contractMask; // Clears non relevant bytes
    } else {
      // Lets get the owner of the NFT Contract
      address nftManager = nftIndexer.nftManager(address(_nftContract));
      if (nftManager != address(0) && nftManager != address(this)) {
        normalizedToken = TypeableNFTManager(nftManager).getNFTTypeId(_nftContract, _token);
      }
    }
  }
}
