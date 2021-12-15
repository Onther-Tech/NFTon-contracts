// SPDX-License-Identifier: MIT
pragma solidity ^0.7.6;

import "./ERC721Proxy.sol";

/// @title A factory that calls the desired stake factory according to stakeType
contract CollectionFactory {

    struct Collection {
        string name;
        string symbol;
        address collection;
        uint256 salt;
    }

    // salt - collection
    mapping(uint256 => address) public salts;
    mapping(address => Collection) public collections;
    address public _owner;
    address public _implementation;
    address public TransferProxy;
    string public _baseURI;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event CreatedCollection(address indexed collection, uint256 indexed salt, string name, string symbol);

    modifier nonZeroAddress(address _addr) {
        require(_addr != address(0), "CollectionFactory: zero address");
        _;
    }
    modifier nonZero(uint256 _val) {
        require(_val > 0, "CollectionFactory: zero value");
        _;
    }
    /// @dev constructor of CollectionFactory
    /// @param _collectionLogic collectionLogic
    constructor(
        address _collectionLogic
    ) {
        require(_collectionLogic != address(0), "FactoryCollection: _collectionLogic zero");

        _owner = msg.sender;

        _implementation = _collectionLogic;
    }

    modifier onlyOwner() {
        require(_owner == msg.sender, "FactoryCollection: caller is not the owner");
        _;
    }

    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "FactoryCollection: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }

    /// @dev Set _implementation address
    function setImplementation(address _new)
        external
        onlyOwner
        nonZeroAddress(_new)
    {
        _implementation = _new;
    }

    /// @dev Create a stake contract that calls the desired stake factory according to stakeType
    /// @param name name
    /// @param symbol symbol
    /// @param admin admin
    /// @param salt salt
    /// @return contract address
    function create(
        string memory name,
        string memory symbol,
        address admin,
        uint256 salt,
        address transferProxy,
        string memory baseURI)
    external
    nonZeroAddress(_implementation)
    nonZeroAddress(admin)
    nonZero(salt)
    returns (address) {
        require(
            salts[salt] == address(0),
            "FactoryCollection: already used salt"
        );

        require(
            bytes(name).length > 0,
            "FactoryCollection: zero name"
        );
        require(
            bytes(symbol).length > 0,
            "FactoryCollection: zero symbol"
        );

        ERC721Proxy collection_ = new ERC721Proxy(name,symbol);
        require(address(collection_) != address(0), "FactoryCollection: zero collection");
        salts[salt] = address(collection_);

        collection_.init(_implementation, baseURI, admin, transferProxy);
        collection_.transferOwnership(admin);

        collections[address(collection_)] = Collection(name,symbol,address(collection_),salt);

        emit CreatedCollection(address(collection_), salt, name, symbol);

        return address(collection_);
    }
}
