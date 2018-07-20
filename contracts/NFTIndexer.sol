pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/NoOwner.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721.sol';
import './manager/IndexableNFTManager.sol';

/**
 * @title Non-Fungible Token Indexer
 * @dev NFTIndexer is a contract for indexing non-fungible tokens with their types on
 * different implementations of NFTManager's compliants smart contracts, allowing
 * a standard for interoperatibility between non-fungible tokens.
 */
contract NFTIndexer is NoOwner {

  using SafeMath for uint256;

  /*
	 * @event Event for adding a new NFTManager.
	 * @param nft address of NFTContract.
	 * @param manager address of NFTManager.
	 */
  event NewNFTManager(address indexed nft, address indexed manager);

  /*
	 * @event Event for adding a new uri to token type.
	 * @param nft address of NFTContract.
	 * @param nftType bytes32 nftType.
   * @param uri string of the uri (ipfs).
	 */
  event NewNFTTypeURI(address indexed nft, bytes32 nftType, string uri);

  // nftContract[]
  address[] public indexedNFTContracts;

  // nftContract => nftType[]
  mapping (address => bytes32[]) public indexedNFTs;

  // nftContract => nftType => nftManager[]
  mapping (address => mapping (bytes32 => address[])) public indexedNFTManagers;

  // nftContract => nftType => nftManager => URI
  mapping (address => mapping (bytes32 => mapping (address => string))) public uri;

  // nftContract => nftManager
  mapping (address => address) public nftManager;

  constructor() public {
  }

  /*
   * @notice Makes the contract type verifiable.
   * @dev Function to prove the contract is NFTIndexer.
   */
  function isNFTIndexer() external pure returns (bool) {
    return true;
  }

  modifier onlyNFTManager() {
    require(IndexableNFTManager(msg.sender).isNFTManager());
    _;
  }

  /**
   * @notice Sets the NFTManager of an NFTContract.
   * @dev Function to set the NFTManager of an NFTContract. Can only be called
   * by the NFTContract owner.
   * @param _nftContract the address of the NFTContract to be associated with the NFTManager.
   * @param _nftManager the address of the NFTManager. The NFTManager should be
   * associated with the current NFTIndexer.
   */
  function setNFTManager(Ownable _nftContract, IndexableNFTManager _nftManager) external {
    require(_nftContract.owner() == msg.sender);
    require(_nftManager.isNFTManager());
    require(_nftManager.nftIndexer() == address(this));
    nftManager[_nftContract] = _nftManager;
    emit NewNFTManager(_nftContract, _nftManager);
  }

  /**
   * @notice Sets URI of a NFTType on a certain NFTContract
   * @dev Function to set the URI of a nftType on a certain NFTContract.
   * @param _nftContract the address of the NFTContract.
   * @param _nftType a bytes32 that represents the token type.
   * @param _uri string representing where the information of the token type
   * its allocated (IPFS).
   */
  function setNFTUri(address _nftContract, bytes32 _nftType, string _uri) external onlyNFTManager {
    bytes memory _uriBytes = bytes(_uri);
    require((_uriBytes).length != 0);
    address _nftManager = msg.sender;
    if(indexedNFTs[_nftContract].length == 0) {
      indexedNFTContracts.push(_nftContract);
    }
    if(indexedNFTManagers[_nftContract][_nftType].length == 0) {
      indexedNFTs[_nftContract].push(_nftType);
    }
    indexedNFTManagers[_nftContract][_nftType].push(_nftManager);
    uri[_nftContract][_nftType][msg.sender] = _uri;
    emit NewNFTTypeURI(_nftContract, _nftType, _uri);
  }

  /**
   * @notice Get Indexed NFTManagersLength
   * @dev Function to get the length of the NFTManagers of a certain token type
   * & NFTContract.
   * @param _nftContract the address of the NFTContract.
   * @param _nftType bytes32 representing the type of the nft.
   * @return uint
   */
  function getIndexedNFTManagersLength(address _nftContract, bytes32 _nftType) external view returns (uint256) {
    return indexedNFTManagers[_nftContract][_nftType].length;
  }
}
