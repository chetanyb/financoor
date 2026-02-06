// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title DEMODOLLAH - Demo ERC-20 token for Financoor testing
/// @notice Faucet-style token that anyone can mint for free (testnet only)
contract DemoToken {
    string public constant name = "DEMODOLLAH";
    string public constant symbol = "DEMO";
    uint8 public constant decimals = 18;
    uint256 public constant FAUCET_AMOUNT = 10_000 * 10**18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /// @notice Mint tokens to yourself (faucet)
    function faucet() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Mint tokens to a specific address
    function faucetTo(address to) external {
        _mint(to, FAUCET_AMOUNT);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        return _transfer(msg.sender, to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "ERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        return _transfer(from, to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal returns (bool) {
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice Allow anyone to mint (demo only - testnet)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
