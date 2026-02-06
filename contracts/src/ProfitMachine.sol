// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DemoToken} from "./DemoToken.sol";

/// @title ProfitMachine - Demo contract that returns 2x deposits
/// @notice Deposit DEMO tokens and receive 2x back instantly (for demo gains)
contract ProfitMachine {
    DemoToken public immutable token;

    event Deposit(address indexed user, uint256 amountIn, uint256 amountOut);

    constructor(address _token) {
        token = DemoToken(_token);
    }

    /// @notice Deposit DEMO tokens and receive 2x back
    /// @param amount Amount of DEMO to deposit
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        // Take deposit from user
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Return 2x by minting the profit to user
        uint256 payout = amount * 2;
        token.mint(msg.sender, payout);

        emit Deposit(msg.sender, amount, payout);
    }
}
