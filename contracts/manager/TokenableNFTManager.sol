pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './IndexableNFTManager.sol';
import '../NFTIndexer.sol';

/**
 * @title Tokenable Non-Fungible Token Manager Standard
 * @dev Extended Indexable NFT Manager, will allow the handling of active tokens
 * on an NFTManager. 
 */
contract TokenableNFTManager is IndexableNFTManager {

  using SafeMath for uint256;

  /*
	 * @event Event for adding active NFT to user.
	 * @param user address of the user who is owner of the nft.
	 * @param nftContract address of the NFTContract.
   * @param nft token.
	 */
  event AddedActiveNFT(address indexed user, address indexed nftContract, uint256 indexed nft);

  /*
	 * @event Event for removing an active NFT from user.
   * @param user address of the user who is owner of the nft.
	 * @param nftContract address of the NFTContract.
   * @param nft token.
	 */
  event RemovedActiveNFT(address indexed user, address indexed nftContract, uint256 indexed nft);

  // user => nftContract[]
  mapping (address => address[]) public activeNFTContracts;
  // user => nftContract => index on activeNFTContracts array
  mapping (address => mapping (address => uint256)) public activeNFTContractsIndex;

  // user => nftContract => nft[]
  mapping (address => mapping (address => uint256[])) public activeNFTs;
  // user => nftContract => nft => index on activeNFTs array
  mapping (address => mapping (address => mapping (uint256 => uint256))) public activeNFTIndex;

  constructor(NFTIndexer _nftIndexer) public IndexableNFTManager(_nftIndexer) {
  }

  /**
   * @notice Sets an NFT active for a user.
   * @dev Sets an NFT active. Should be called from the user. This will help
   * track what NFTs a user has active.
   * @param _nftContract the address of the NFTContract.
   * @param _token token that user owns and wants to activate.
   */
  function setNFTActive(ERC721 _nftContract, uint256 _token) external {
    require(msg.sender == _nftContract.ownerOf(_token));

    // Checks if token is not already active
    uint256 tokenIndex = activeNFTIndex[msg.sender][_nftContract][_token];
    require(
      (activeNFTs[msg.sender][_nftContract].length == 0 && tokenIndex == 0) ||
      (activeNFTs[msg.sender][_nftContract].length > tokenIndex && _token != activeNFTs[msg.sender][_nftContract][tokenIndex])
    );

    // Tracks nftContract per user
    uint256 contractIndex = activeNFTContractsIndex[msg.sender][_nftContract];
    if (activeNFTContracts[msg.sender].length <= contractIndex ||
      _nftContract != activeNFTContracts[msg.sender][contractIndex]) {
      activeNFTContractsIndex[msg.sender][_nftContract] = activeNFTContracts[msg.sender].push(_nftContract) - 1;
    }

    // No need to check if it's already active since it passed the require.
    activeNFTIndex[msg.sender][_nftContract][_token] = activeNFTs[msg.sender][_nftContract].push(_token) - 1;

    // Emmits event
    emit AddedActiveNFT(msg.sender, _nftContract, _token);
  }

  /**
   * @notice Removes an active NFT from a user.
   * @dev Removes an active NFT. Should be called from the user. This will help
   * track what NFTs a user has active.
   * @param _nftContract the address of the NFTContract.
   * @param _token token that user owns and wants to activate.
   */
  function removeActiveNFT(ERC721 _nftContract, uint256 _token) external {

    // Checks if token is active
    uint256 tokenIndex = activeNFTIndex[msg.sender][_nftContract][_token];
    require(
      activeNFTs[msg.sender][_nftContract].length > tokenIndex &&
       _token == activeNFTs[msg.sender][_nftContract][tokenIndex]
    );

    uint256 lastToken = activeNFTs[msg.sender][_nftContract][activeNFTs[msg.sender][_nftContract].length - 1];

    if (activeNFTs[msg.sender][_nftContract].length > 1 && _token != lastToken) {
      activeNFTs[msg.sender][_nftContract][tokenIndex] = lastToken;
      activeNFTIndex[msg.sender][_nftContract][lastToken] = tokenIndex;
    }
    delete activeNFTIndex[msg.sender][_nftContract][_token];
    delete activeNFTs[msg.sender][_nftContract][activeNFTs[msg.sender][_nftContract].length - 1];
    activeNFTs[msg.sender][_nftContract].length = activeNFTs[msg.sender][_nftContract].length.sub(1);


    // Removes activeNFTContract if there are no more tokens
    if (activeNFTs[msg.sender][_nftContract].length == 0) {
      uint256 contractIndex = activeNFTContractsIndex[msg.sender][_nftContract];
      address lastContract = activeNFTContracts[msg.sender][activeNFTContracts[msg.sender].length - 1];

      if (_nftContract != lastContract) {
        activeNFTContracts[msg.sender][contractIndex] = lastContract;
        activeNFTContractsIndex[msg.sender][lastContract] = contractIndex;
      }

      delete activeNFTContractsIndex[msg.sender][_nftContract];
      delete activeNFTContracts[msg.sender][activeNFTContracts[msg.sender].length - 1];
      activeNFTContracts[msg.sender].length = activeNFTContracts[msg.sender].length.sub(1);
    }
    // Emmits event
    emit RemovedActiveNFT(msg.sender, _nftContract, _token);
  }

  /**
   * @notice Is Token Active
   * @dev Detect if a token of a user is active or not.
   * @param _owner the address of the owner of the token.
   * @param _nftContract the address of the NFTContract.
   * @param _token token that user owns and wants to activate.
   * @return bool
   */
  function isTokenActive(address _owner, ERC721 _nftContract, uint256 _token) external view returns(bool active) {
    if (_owner != _nftContract.ownerOf(_token)) return false;

    uint256 tokenIndex = activeNFTIndex[_owner][_nftContract][_token];
    active = activeNFTs[_owner][_nftContract].length > tokenIndex &&
             _token == activeNFTs[_owner][_nftContract][tokenIndex];
  }

}
