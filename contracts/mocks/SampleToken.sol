pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import 'openzeppelin-solidity/contracts/ownership/NoOwner.sol';

/**
 * @title SampleToken
 * @dev SampleToken is a mintable ERC721.
 * This is a contract developed only for testing purposes, despite the fact
 * that the idea of hashing a string, and making it a token type is valid,
 * do not use this smart contract for a production ready mintable NFT since
 * it does not have all the validations needed.
 * IMPORTANT: Not intended to be deployed on a mainnet.
 */

contract SampleToken is ERC721Token, NoOwner {

  bytes16[] public tokenTypes;
  mapping(bytes16 => uint128) typesQuantities;
  mapping(bytes16 => uint128) typesMinted;

  constructor(string _name, string _symbol) public ERC721Token(_name, _symbol) {
  }

  function setTokenTypeAndQuantity(bytes16 _hashedType, uint128 _typeQuantities) external onlyOwner {
    require(_typeQuantities > 0);
    require(typesQuantities[_hashedType] == 0);
    typesQuantities[_hashedType] = _typeQuantities;
    tokenTypes.push(_hashedType);
  }

  function mint(address _beneficiary, bytes16 _hashedType) external onlyOwner {
    require(typesMinted[_hashedType] < typesQuantities[_hashedType]);

    // Does not require bite shifting to clean extra bits because we are getting it from bytes16
    bytes32 tokenIdMasked = bytes32(_hashedType);

    // Add one minted to the minted mapping.
    typesMinted[_hashedType] = typesMinted[_hashedType] + 1;
    bytes32 quantityId = bytes32(typesMinted[_hashedType]);

    uint256 tokenId = uint256(tokenIdMasked | quantityId);

    _mint(_beneficiary, tokenId);
  }

  function stringToBytes32(string memory source) internal view returns (bytes32 result) {
    bytes memory tempEmptyStringTest = bytes(source);
    if (tempEmptyStringTest.length == 0) {
      return 0x0;
    }
    assembly {
      result := mload(add(source, 32))
    }
  }
  function stringToHash(string _typeName) public view returns (bytes16) {
    return bytes16(keccak256(stringToBytes32(_typeName)));
  }
}
