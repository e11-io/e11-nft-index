pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import './MintingUtility.sol';

contract MintableNFT is ERC721Token, MintingUtility {
  using SafeMath for uint256;

  uint8 public bitsMask;
  uint248 public maxMask;

  mapping (uint256 => uint256) public tokenTypeQuantity;
  mapping (uint256 => uint256) public tokenTypeAvailableQuantity;

  constructor(string _name, string _symbol, uint8 _quantityMask) ERC721Token(_name, _symbol) public {
    require(_quantityMask > 0); // The mask has to be bigger than zero
    require(_quantityMask < 32); // The mask can not occupy the entire length, because we need at least one byte to reflect the token type
    bitsMask = _quantityMask * 8; // Mask is set at creation and can't be modified (max 248 bits, fits on uint8(256))
    uint256 maximumValueOfMask = uint256(2) ** (uint256(bitsMask)) - 1; // Gets the maximum uint value for the mask;
    maxMask = uint248(maximumValueOfMask);
  }

  /*
   * @notice Makes the contract type verifiable.
   * @dev Function to prove the contract is MintableNFT.
   */
  function isMintableNFT() external pure returns (bool) {
    return true;
  }

  /*
   @dev Establishes ownership and brings token into existence AKA minting a token
   @param _beneficiary - who gets the the tokens
   @param _tokenIds - tokens.
  */
  function mint(address _beneficiary,
                uint256 _tokenType) public onlyMinter whenNotPaused  {

    require(tokenTypeAvailableQuantity[_tokenType] > 0);
    bytes32 tokenIdMasked = bytes32(_tokenType) << bitsMask;

    tokenTypeAvailableQuantity[_tokenType] = tokenTypeAvailableQuantity[_tokenType].sub(1);
    bytes32 quantityId = bytes32(tokenTypeQuantity[_tokenType].sub(tokenTypeAvailableQuantity[_tokenType]));

    uint256 tokenId = uint256(tokenIdMasked | quantityId);
    // This will assign ownership, and also emit the Transfer event
    _mint(_beneficiary, tokenId);
  }

  function setTokensQuantity(uint256[] _tokenTypes, uint248[] _quantities) public onlyOwner {
    require(_tokenTypes.length > 0 && _tokenTypes.length == _quantities.length);
    bytes32 normalizedToken;
    for (uint i = 0; i < _tokenTypes.length; i++) {

      normalizedToken = bytes32(_tokenTypes[i]); // Clears non relevant bytes
      normalizedToken = normalizedToken << bitsMask; // Clears non relevant bytes
      normalizedToken = normalizedToken >> bitsMask; // Clears non relevant bytes

      require(uint256(normalizedToken) == _tokenTypes[i]); // Avoids overflow mistakes when setting the tokens quantities
      require(tokenTypeQuantity[_tokenTypes[i]] == 0); // Ensures quantity is not set
      require(_quantities[i] > 0 && _quantities[i] <= maxMask); // Ensures no overflow by using maxMask as quantity.

      tokenTypeQuantity[_tokenTypes[i]] = _quantities[i];
      tokenTypeAvailableQuantity[_tokenTypes[i]] = _quantities[i];
    }
  }

  function getOwnedTokensIds(address _owner) external view returns (uint[] tokensIds) {
    tokensIds = new uint[](balanceOf(_owner));

    for (uint i = 0; i < balanceOf(_owner); i++) {
      tokensIds[i] = tokenOfOwnerByIndex(_owner, i);
    }

    return tokensIds;
  }

}
