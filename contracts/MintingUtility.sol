pragma solidity ^0.4.23;

import 'openzeppelin-solidity/contracts/lifecycle/Pausable.sol';
import 'openzeppelin-solidity/contracts/ownership/NoOwner.sol';

contract MintingUtility is Pausable, NoOwner {
  mapping (address => bool) public _authorizedMinters;

  /*
    Only minter contracts can access via this modifier
    Also, a minter either owns this contract or is in authorized list
  */
  modifier onlyMinter() {
    bool isAuthorized = _authorizedMinters[msg.sender];
    require(isAuthorized || msg.sender == owner);
    _;
  }

  /*
      @dev Will add a contract or address that can call minting function on
      token contract
      @param _minter address of minter to add
      @param _isAuthorized set authorized or not
  */
  function setAuthorizedMinter(address _minter, bool _isAuthorized) external onlyOwner {
    _authorizedMinters[_minter] = _isAuthorized;
  }

}
