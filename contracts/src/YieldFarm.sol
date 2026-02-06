// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {DemoToken} from "./DemoToken.sol";

/// @title YieldFarm - Demo staking contract with fast rewards
/// @notice Stake DEMO tokens and earn rewards over time (accelerated for demo)
contract YieldFarm {
    DemoToken public immutable token;

    // 10% rewards per block (very fast for demo purposes)
    uint256 public constant REWARD_RATE = 10;

    struct Stake {
        uint256 amount;
        uint256 startBlock;
        uint256 claimedRewards;
    }

    mapping(address => Stake) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _token) {
        token = DemoToken(_token);
    }

    /// @notice Stake DEMO tokens
    /// @param amount Amount to stake
    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");

        // Claim any pending rewards first
        _claimRewards(msg.sender);

        // Transfer tokens to contract
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        // Update stake
        stakes[msg.sender].amount += amount;
        if (stakes[msg.sender].startBlock == 0) {
            stakes[msg.sender].startBlock = block.number;
        }

        emit Staked(msg.sender, amount);
    }

    /// @notice Unstake all DEMO tokens
    function unstake() external {
        Stake storage s = stakes[msg.sender];
        require(s.amount > 0, "Nothing staked");

        // Claim pending rewards
        _claimRewards(msg.sender);

        // Return staked tokens
        uint256 amount = s.amount;
        s.amount = 0;
        s.startBlock = 0;
        s.claimedRewards = 0;

        token.transfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /// @notice Claim accumulated rewards
    function claimRewards() external {
        _claimRewards(msg.sender);
    }

    /// @notice View pending rewards
    function pendingRewards(address user) public view returns (uint256) {
        Stake storage s = stakes[user];
        if (s.amount == 0) return 0;

        uint256 blocks = block.number - s.startBlock;
        uint256 totalRewards = (s.amount * REWARD_RATE * blocks) / 100;
        return totalRewards - s.claimedRewards;
    }

    function _claimRewards(address user) internal {
        uint256 rewards = pendingRewards(user);
        if (rewards > 0) {
            stakes[user].claimedRewards += rewards;
            token.mint(user, rewards);
            emit RewardsClaimed(user, rewards);
        }
    }
}
