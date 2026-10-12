// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Zapzive sandbox stablecoin
/// @notice A deliberately simple, non-upgradeable ERC-20 for public testnets.
///         This token has no redemption value and is not USDT, DAI, or USDC.
contract ZapziveTestStablecoin {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed tokenOwner, address indexed spender, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "ZapziveTestStablecoin: not owner");
        _;
    }

    constructor(string memory tokenName, string memory tokenSymbol, uint8 tokenDecimals) {
        require(bytes(tokenName).length > 0, "ZapziveTestStablecoin: empty name");
        require(bytes(tokenSymbol).length > 0, "ZapziveTestStablecoin: empty symbol");
        require(tokenDecimals <= 18, "ZapziveTestStablecoin: invalid decimals");
        name = tokenName;
        symbol = tokenSymbol;
        decimals = tokenDecimals;
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        require(approved >= value, "ZapziveTestStablecoin: allowance exceeded");
        if (approved != type(uint256).max) allowance[from][msg.sender] = approved - value;
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external onlyOwner {
        require(to != address(0), "ZapziveTestStablecoin: zero recipient");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    function burn(uint256 value) external {
        require(balanceOf[msg.sender] >= value, "ZapziveTestStablecoin: balance exceeded");
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZapziveTestStablecoin: zero owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "ZapziveTestStablecoin: zero recipient");
        require(balanceOf[from] >= value, "ZapziveTestStablecoin: balance exceeded");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
