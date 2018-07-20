---
eip: <to be assigned>
title: ERC-<TBA> NFT Index Proposal
author: Luciano Bertenasco <luciano@e11.io>, Alejo Amiras <alejo@e11.io>, Francisco Diaz <francisco@e11.io>
discussions-to: luciano@e11.io
status: Draft
type: Standards Track
category: ERC
created: 2018-06-27
requires: 173, 721
---

## Simple Summary
<!--"If you can't explain it simply, you don't understand it well enough." Provide a simplified and layman-accessible explanation of the EIP.-->

A standard set of contracts for globally defining and tracking non-fungible tokens.

## Abstract
<!--A short (~200 word) description of the technical issue being addressed.-->

The following standard allows for the interoperability of non-fungible tokens. This standard provides basic functionality to track, identify, and get information about different implementations of non-fungible tokens across different NFTs Managers.

## Motivation
<!--The motivation is critical for EIPs that want to change the Ethereum protocol. It should clearly explain why the existing protocol specification is inadequate to address the problem that the EIP solves. EIP submissions without sufficient motivation may be rejected outright.-->

A standard interface allows game/wallet/broker/auction applications to work with any NFT Manager & NFT on Ethereum. We think this will allow much more contributions and co-operability between different teams & applications through out the crypto space. Furthermore it will expand the use of current deployed and owned NFTs, adding more value and creating new ways of using and interacting with them.

We find interoperability as being one of the key components that still needs to be explored, and a set of standard contracts will help achieve this.

## Specification
<!--The technical specification should describe the syntax and semantics of any new feature. The specification should be detailed enough to allow competing, interoperable implementations for any of the current Ethereum platforms (go-ethereum, parity, cpp-ethereum, ethereumj, ethereumjs, and [others](https://github.com/ethereum/wiki/wiki/Clients)).-->
This is a versatile implementation, we tried the best to not impose ways of working with the data types (see "rationale/design decisions", below). We propose one shared contract *NFTIndexer* , and one standard contract *NFTManager* designed to be **extendable**.

### NFTIndexer
We will talk about *NFTIndexer* since it's the one that will hold information about the *NFTManagers*.

Keeps track of Standard NFT Contracts & their Token types, which allows NFT Managers to add their specific URI implementations to them.
It also has a record of which NFT Manager corresponds to which Standard NFT Token. This is used to translate an NFT hash to it's type definition to be searched on the index.
i.e. Take for example CryptoWars and CryptoKitties.
Let's assume that the Standard NFT CryptoKitties Contract is on 0xKitties, and the CryptoWars's NFT Manager Contract is on 0xWarsManager.
And we want to implement our awesome skin of a gen0 kittie 0xGen0Kittie001 on the CryptoWars game.
What we would do is the following:
1) Get the typeId of 0xGen0Kittie001 from the CryptoKitties NFT Manager 0xKittieManager, which will return 0xGen0Kittie.
2) Execute CryptoWarsNFTManager.AddNFTIndex(0xKitties, 0xGen0Kittie, URI)
Where 0xKitties is the address of the contract in charge of managing 0xGen0Kittie001, and URI can be an IPFS url with the desired implementation of the asset (i.e. a picture of a warrior holding a kitty balloon)

#### Methods
##### isNFTIndexer
```solidity
function isNFTIndexer() external pure returns (bool)
```
Makes the contract verifiable.

##### setNFTManager
```solidity
function setNFTManager(Ownable _nftContract, IndexableNFTManager _nftManager) external
```
Will set what NFTManager handles the NFTContract, this will be used in the *NFTManager* when asking for a default type of a token (see "TypeableNFTManager", below).
Only one manager will be the **owner of an NFTContract**.

For the successful execution of `setNFTManager()`:
* It MUST be called by the owner of the NFTContract.
* The NFTManager provided as a parameter MUST have *this* (NFTIndexer) as their NFTIndexer.
* The NFTManager provided as a parameter MUST be an IndexableNFTManager.

##### setNFTUri
```solidity
function setNFTUri(address _nftContract, bytes32 _nftType, string _uri) external onlyNFTManager
```
Will set an URI for a certain NFT type within an NFTContract.

For the successful execution of `setNFTUri()`:
* It MUST be called from an *NFTManager* (that's why there is a proxy call from NFTManager, see "IndexableNFTManager" below).
* The URI parameter should not be an empty string.

#### Events
##### NewNFTManager
This event MUST be triggered on any successful call `setNFTManager(Ownable _nftContract, IndexableNFTManager _nftManager)`.  
See the documentation for the `setNFTManager()` method above for further detail.
```solidity
event NewNFTManager(address indexed nftContract, address indexed manager);
```

##### NewNFTTypeURI
This event MUST be triggered on any successful call `setNFTUri(address _nftContract, bytes32 _nftType, string _uri)`.  
See the documentation for the `setNFTUri()` method above for further detail.
```solidity
event NewNFTTypeURI(address indexed nftContract, bytes32 nftType, string uri);
```

### NFTManager
An NFTManager can be as simple as inheriting the *IndexableNFTManager* contract, or it can *also* gain some additional logic, as demonstrated via *TypeableNFTManager*, *TokenableNFTManager* and since it's expandable, we expect further development from the community.

#### IndexableNFTManager
IndexableNFTManager is the core of the NFTManager design. It will make the contract verifiable from the NFTIndexer, and it will have our proxy call to **setNFTUri** on the desired *NFTIndexer*.

##### Methods
###### isNFTManager
```solidity
function isNFTManager() external pure returns (bool)
```
Makes the contract verifiable.

###### setNFTIndexer
```solidity
function setNFTIndexer(NFTIndexer _nftIndexer) external onlyOwner
```

For the successful execution of `setNFTIndexer()`:
* It MUST be called by the owner of the *NFTManager* contract.
* The *NFTIndexer* parameter should be a verifiable *NFTIndexer* contract.

###### setNFTUri
```solidity
function setNFTUri(address _nftContract, bytes32 _nftType, string _uri) external onlyOwner
```

For the successful execution of `setNFTUri()`:
* It MUST be called by the owner of the *NFTManager* contract.
* The URI parameter should not be an empty string.

#### TypeableNFTManager
TypeableNFTManager will be an extended IndexableNFTManager, as it was explained above, it will add some additional logic to the *NFTManager*.
This module will help manage the NFT types via bit shifting (and other bit operations).

##### Methods
###### setNFTTypeMask
```solidity
function setNFTTypeMask(address _nftContract, uint8 _quantityMask) external onlyOwner
```
`setNFTTypeMask()` will set the amount of bytes that will be shifted from a tokenId, in order to get it's type. For example:
```solidity
nftType = tokenId >> _quantityMask * 8;
```

For the successful execution of `setNFTTypeMask()`:
* It MUST be called by the owner of the *NFTManager* contract.
* The parameter quantity mask must be less than 32. This parameter will represent the amount of bytes that will be shifted from the token id, to get an NFT type.

###### getNFTTypeId
```solidity
function getNFTTypeId(Ownable _nftContract, uint256 _token) external view returns(bytes32 normalizedToken)
```

`getNFTTypeId()` will return the token type of a given token and a given *NFTContract*.
In case there is no token type defined for that contract within this manager, it will ask the *NFTIndexer* to get that token type from the *NFTManager* that owns that *NFTContract*.
In case there is none defined, it will return the token id without any change.

#### TokenableNFTManager
TokenableNFTManager will be an extended IndexableNFTManager, as it was explained above, it will add some additional logic to the *NFTManager*.
This module will help manage active NFTs. (i.e. NFTs being used by a user in a game)

##### Methods
###### setNFTActive
```solidity
function setNFTActive(ERC721 _nftContract, uint256 _token) external
```
Will set as active a certain token on a certain *NFTContract*.

For the successful execution of `setNFTActive()`:
* It MUST be called by the token current owner.
* The token MUST NOT be already active.

###### removeActiveNFT
```solidity
function removeActiveNFT(ERC721 _nftContract, uint256 _token) external
```
Will remove a certain NFT from the active NFT mapping on a certain *NFTContract*

For the successful execution of `removeActiveNFT()`:
* The token MUST be active.

###### isTokenActive
```solidity
function isTokenActive(address _owner, ERC721 _nftContract, uint256 _token) external view returns(bool active)
```
Will return token active status.

##### Events
###### AddedActiveNFT
This event MUST be triggered on any successful call `setNFTActive(ERC721 _nftContract, uint256 _token)`.  
See the documentation for the `setNFTActive()` method above for further detail.

```solidity
event AddedActiveNFT(address indexed user, address indexed nftContract, uint256 indexed nft)
````

###### RemovedActiveNFT
This event MUST be triggered on any successful call `removeActiveNFT(ERC721 _nftContract, uint256 _token)`.  
See the documentation for the `removeActiveNFT()` method above for further detail.

```solidity
event RemovedActiveNFT(address indexed user, address indexed nftContract, uint256 indexed nft)
```

## Rationale
<!--The rationale fleshes out the specification by describing what motivated the design and why particular design decisions were made. It should describe alternate designs that were considered and related work, e.g. how the feature is supported in other languages. The rationale may also provide evidence of consensus within the community, and should discuss important objections or concerns raised during discussion.-->
### Design decision making
* NFTIndexer existence: Previous iterations of the design did not have an NFTIndexer.
Every NFTManager had, for example, their own mappings `nftContract => nftType`, basically, every NFTManager was an Indexer too.  
This design brought some issues to light:
1. No easy way of knowing from an *NFTManager* who owned which *NFTContract*, therefore there was no easy way of asking the *NFTContract* for a specific NFT type.
2. There was also the issue of having to re-deploy duplicated code on every manager, wasting precious storage & gas.

* Data Types: One of our main concerns was not to make the design too opinionated, specially on the NFT Types system.
That's why we divided the design on TokenableNFTManager, TypeableNFTManager and IndexableNFTManager.

There might still be some caveats that we did not notice, so please, comment freely on how to improve the design.
We want it to be as useful as it can be, and adaptable as it can be, so everyone in the community can easily use it.

### Utility
See example on **NFTIndexer** description.

<!--## Backwards Compatibility-->
<!--All EIPs that introduce backwards incompatibilities must include a section describing these incompatibilities and their severity. The EIP must explain how the author proposes to deal with these incompatibilities. EIP submissions without a sufficient backwards compatibility treatise may be rejected outright.-->

## Test Cases
<!--Test cases for an implementation are mandatory for EIPs that are affecting consensus changes. Other EIPs can choose to include links to test cases if applicable.-->
[e11 NFT Index Proposal](https://github.com/e11-io/e11-nft-index) repository includes various test cases using Truffle.

## Implementation
<!--The implementations must be completed before any EIP is given status "Final", but it need not be completed before the EIP is accepted. While there is merit to the approach of reaching consensus on the specification and rationale before writing code, the principle of "rough consensus and running code" is still useful when it comes to resolving many discussions of API details.-->
e11 NFT Index Proposal -- a reference implementation
* MIT licensed, so you can freely use it for your projects
* Includes unit tests and full code coverage
* Includes test cases and further code documentation

## References
### Implementation
1. [e11 NFT Index Proposal](https://github.com/e11-io/e11-nft-index)

### Standards
1. [ERC-173 Ownable Standard.](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-173.md)
2. [ERC-721 Non-Fungible Token Standard.](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-721.md)

### Issues
### Discussions

## Copyright
Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
