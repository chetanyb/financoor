//! Financoor Core - shared types, tax math, and categorization logic
//!
//! This crate is used by both the API server and the SP1 zkVM program.

use alloy_sol_types::sol;
use serde::{Deserialize, Serialize};

/// User entity type for tax calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserType {
    Individual,
    Huf, // Hindu Undivided Family
    Corporate,
}

/// Transaction category for tax purposes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    /// Professional income (external inflows)
    Income,
    /// VDA/crypto gains from demo contracts
    Gains,
    /// VDA/crypto losses from demo contracts
    Losses,
    /// Gas/transaction fees paid
    Fees,
    /// Transfers between user's own wallets
    Internal,
    /// Unclassified - needs review
    Unknown,
}

/// Direction of a transaction
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    In,
    Out,
}

/// A normalized ledger row (chain-agnostic)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerRow {
    pub chain_id: u64,
    pub owner_wallet: String,
    pub tx_hash: String,
    pub block_time: u64,
    pub asset: String,
    pub amount: String, // String to preserve precision
    pub decimals: u8,
    pub direction: Direction,
    pub counterparty: Option<String>,
    pub category: Category,
    pub confidence: f32,
    pub user_override: bool,
}

/// Price entry for an asset (used in tax calculation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceEntry {
    pub asset: String,
    pub usd_price: String, // String to preserve precision
}

/// Complete input for tax calculation and proving
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxInput {
    pub user_type: UserType,
    pub wallets: Vec<String>,
    pub ledger: Vec<LedgerRow>,
    pub prices: Vec<PriceEntry>,
    pub usd_inr_rate: String,
    /// Whether to apply 44ADA presumptive taxation (Individual only)
    pub use_44ada: bool,
}

/// Tax calculation breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxBreakdown {
    /// Total professional income (INR)
    pub professional_income_inr: String,
    /// Taxable professional income after 44ADA (if applicable)
    pub taxable_professional_income_inr: String,
    /// VDA gains (INR)
    pub vda_gains_inr: String,
    /// VDA losses (INR) - displayed but not offset
    pub vda_losses_inr: String,
    /// Professional income tax (slab-based)
    pub professional_tax_inr: String,
    /// VDA tax at 30%
    pub vda_tax_inr: String,
    /// Health & Education Cess (4%)
    pub cess_inr: String,
    /// Total tax payable
    pub total_tax_inr: String,
}

// ABI-encodable struct for on-chain verification
sol! {
    /// Public values output by the SP1 program
    struct TaxProofPublicValues {
        /// Keccak256 hash of the input ledger
        bytes32 ledgerCommitment;
        /// Total tax payable in paisa (INR * 100)
        uint256 totalTaxPaisa;
        /// User type (0=Individual, 1=HUF, 2=Corporate)
        uint8 userType;
        /// Whether 44ADA was applied
        bool used44ada;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_type_serialization() {
        let ut = UserType::Individual;
        let json = serde_json::to_string(&ut).unwrap();
        assert_eq!(json, "\"individual\"");
    }
}
