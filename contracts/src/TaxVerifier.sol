// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ISP1Verifier} from "./ISP1Verifier.sol";

/// @title TaxVerifier
/// @notice Verifies SP1 proofs for tax calculations
contract TaxVerifier {
    /// @notice The SP1 verifier contract
    ISP1Verifier public immutable verifier;

    /// @notice The verification key for the tax-zk program
    bytes32 public immutable taxZkVkey;

    /// @notice Emitted when a tax proof is verified
    event TaxProofVerified(
        bytes32 indexed ledgerCommitment,
        uint256 totalTaxPaisa,
        uint8 userType,
        bool used44ada,
        address indexed verifiedBy
    );

    /// @notice Struct to store verified tax records
    struct TaxRecord {
        uint256 totalTaxPaisa;
        uint8 userType;
        bool used44ada;
        uint256 verifiedAt;
        address verifiedBy;
    }

    /// @notice Mapping from ledger commitment to tax record
    mapping(bytes32 => TaxRecord) public taxRecords;

    constructor(address _verifier, bytes32 _taxZkVkey) {
        verifier = ISP1Verifier(_verifier);
        taxZkVkey = _taxZkVkey;
    }

    /// @notice Verify a tax proof and store the result
    /// @param proofBytes The SP1 proof bytes
    /// @param publicValues The ABI-encoded public values from the proof
    function verifyTaxProof(
        bytes calldata proofBytes,
        bytes calldata publicValues
    ) external {
        // Verify the proof with SP1 verifier
        verifier.verifyProof(taxZkVkey, publicValues, proofBytes);

        // Decode public values
        (
            bytes32 ledgerCommitment,
            uint256 totalTaxPaisa,
            uint8 userType,
            bool used44ada
        ) = abi.decode(publicValues, (bytes32, uint256, uint8, bool));

        // Store the verified record
        taxRecords[ledgerCommitment] = TaxRecord({
            totalTaxPaisa: totalTaxPaisa,
            userType: userType,
            used44ada: used44ada,
            verifiedAt: block.timestamp,
            verifiedBy: msg.sender
        });

        emit TaxProofVerified(
            ledgerCommitment,
            totalTaxPaisa,
            userType,
            used44ada,
            msg.sender
        );
    }

    /// @notice Check if a ledger commitment has been verified
    function isVerified(bytes32 ledgerCommitment) external view returns (bool) {
        return taxRecords[ledgerCommitment].verifiedAt > 0;
    }

    /// @notice Get the tax record for a ledger commitment
    function getTaxRecord(bytes32 ledgerCommitment) external view returns (TaxRecord memory) {
        return taxRecords[ledgerCommitment];
    }
}
