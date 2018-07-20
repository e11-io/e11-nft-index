pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/math/SafeMath.sol';
import 'openzeppelin-solidity/contracts/ownership/Ownable.sol';
import 'openzeppelin-solidity/contracts/token/ERC721/ERC721Token.sol';
import './MintableNFT.sol';

/**
 * @title NFTMinter
 * @dev NFTMinter is a base contract for managing a 721 token crowdsale.
 * It is strongly based on zeppelin solidity ERC20 crowdsale contract
 * Crowdsales have a start and end timestamps, where investors can make
 * token purchases and the crowdsale will mint their tokens.
 * Funds collected are forwarded to a wallet as they arrive.
 */
contract NFTMinter is MintingUtility {

  using SafeMath for uint256;

  event TokenPurchase(address indexed purchaser, uint256 price, uint256 tokenType);

  // address where funds are collected
  address public wallet;

  // amount of raised money in wei
  uint256 public weiRaised;

  // This token exposes minting on the 721 standard token contract
  // Either be owner of the NFT contract for minting purposes,
  // or share the same owner to allow minting from here
  MintableNFT public nftContract;

  // Array of enabled token types
  uint256[] public enabledTokens;

  // tokenType => enabledToken index - will give the index where the type is located on enabledToken
  mapping (uint256 => uint256) public enabledTokenIndex;

  // Price per token type
  mapping (uint256 => uint256) public tokenTypePrices;

  constructor(address _wallet,
              MintableNFT _nftContract) public {

    require(_wallet != address(0));
    require(_nftContract.isMintableNFT());
    wallet = _wallet;
    nftContract = _nftContract;
  }

  function setTokenPrices(uint256[] _tokenTypes, uint256[] _prices) public onlyOwner {
    require(_tokenTypes.length > 0 && _tokenTypes.length == _prices.length);

    for (uint i = 0; i < _tokenTypes.length; i++) {
      require(nftContract.tokenTypeQuantity(_tokenTypes[i]) > 0);
      tokenTypePrices[_tokenTypes[i]] = _prices[i];

      require(enabledTokens.length == 0 || enabledTokens[enabledTokenIndex[_tokenTypes[i]]] != _tokenTypes[i]);

      enabledTokenIndex[_tokenTypes[i]] = enabledTokens.push(_tokenTypes[i]) - 1;
    }
  }

  function disableTokens(uint256[] _tokenTypes) public onlyOwner {
    require(_tokenTypes.length > 0);

    for (uint i = 0; i < _tokenTypes.length; i++) {
      require(tokenEnabled(_tokenTypes[i]));
      uint256 lastToken = enabledTokens[enabledTokens.length.sub(1)];
      enabledTokens[enabledTokenIndex[_tokenTypes[i]]] = lastToken;
      enabledTokenIndex[lastToken] = enabledTokenIndex[_tokenTypes[i]];
      enabledTokens.length = enabledTokens.length.sub(1);

      delete enabledTokenIndex[_tokenTypes[i]];
    }
  }

  // low level token purchase function
  function buyTokens(uint256 _tokenType) public payable {
    require(tokenEnabled(_tokenType));
    require(validPurchase(_tokenType));

    uint256 weiAmount = msg.value;

    // update state
    weiRaised = weiRaised.add(weiAmount);

    emit TokenPurchase(msg.sender, weiAmount, _tokenType);

    forwardFunds(); // calls up to refundable crowdsale

    // mint externally on mintable crowdsale
    nftContract.mint(msg.sender, _tokenType);
  }

  // send ether to the fund collection wallet
  // override to create custom fund forwarding mechanisms
  function forwardFunds() internal {
    // not actually used, this is overridden by refundable crowdsale
    wallet.transfer(msg.value);
  }

  // @param _tokenType - pass the tokens to price
  // @return true if the transaction can buy tokens
  // override to change the price/quantity rates
  function validPurchase(uint256 _tokenType) internal view returns (bool) {
    bool availableTokens = nftContract.tokenTypeAvailableQuantity(_tokenType) >= 1;
    bool correctPayment = msg.value == tokenTypePrices[_tokenType];
    return availableTokens && correctPayment;
  }

  // checks if token is enabled
  function tokenEnabled(uint256 _tokenType) public view returns (bool) {
    return enabledTokens.length > enabledTokenIndex[_tokenType] &&
           enabledTokens[enabledTokenIndex[_tokenType]] == _tokenType;
  }

  /*
   * @title Get Enabled Tokens Length
   * @dev Get the length of the enabledTokens.
   */
  function getEnabledTokensLength() external view returns (uint length) {
    return enabledTokens.length;
  }

  /*
   * @title Get marketplace information
   * @dev Gets types, prices, quantities and available quantities for all enabled
   * tokens.
   */
  function getEnabledTokensInformation() external view returns (uint256[] tokenTypesIds,
                                                                uint256[] tokenTypesPrices,
                                                                uint256[] tokenTypesQuantities,
                                                                uint256[] tokenTypesAvailableQuantities) {
    tokenTypesIds = new uint[](enabledTokens.length);
    tokenTypesPrices = new uint[](enabledTokens.length);
    tokenTypesQuantities = new uint[](enabledTokens.length);
    tokenTypesAvailableQuantities = new uint[](enabledTokens.length);
    for (uint i = 0; i < enabledTokens.length; i++) {
      tokenTypesIds[i] = (enabledTokens[i]);
      tokenTypesPrices[i] = (tokenTypePrices[enabledTokens[i]]);
      tokenTypesQuantities[i] = (nftContract.tokenTypeQuantity(enabledTokens[i]));
      tokenTypesAvailableQuantities[i] = (nftContract.tokenTypeAvailableQuantity(enabledTokens[i]));
    }
  }
}
