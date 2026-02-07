// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISP1Verifier} from "./ISP1Verifier.sol";

/// @title MockSP1Verifier
/// @notice Mock verifier for demo/testing - always accepts proofs
/// @dev DO NOT USE IN PRODUCTION - this is for hackathon demo only
contract MockSP1Verifier is ISP1Verifier {
    /// @notice Emitted when a proof is "verified" (mock)
    event ProofVerified(bytes32 vkey, bytes publicValues, bytes proofBytes);

    /// @notice Always succeeds - mock implementation for demo
    function verifyProof(
        bytes32 vkey,
        bytes calldata publicValues,
        bytes calldata proofBytes
    ) external view override {
        // Mock verifier - always passes
        // In production, this would call the actual SP1 verifier
        // Suppress unused variable warnings
        vkey;
        publicValues;
        proofBytes;
    }
}
