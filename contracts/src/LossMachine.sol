// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DemoToken} from "./DemoToken.sol";

/// @title LossMachine - Demo contract that returns 0.5x deposits
/// @notice Deposit DEMO tokens and receive half back (for demo losses)
contract LossMachine {
    DemoToken public immutable token;

    event Deposit(address indexed user, uint256 amountIn, uint256 amountOut);

    constructor(address _token) {
        token = DemoToken(_token);
    }

    /// @notice Deposit DEMO tokens and receive 0.5x back
    /// @param amount Amount of DEMO to deposit
    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        // Take deposit from user
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Return only half (loss)
        uint256 payout = amount / 2;
        if (payout > 0) {
            token.mint(msg.sender, payout);
        }

        emit Deposit(msg.sender, amount, payout);
    }
}
