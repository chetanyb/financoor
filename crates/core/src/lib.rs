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

/// Source of wallet discovery
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WalletSource {
    Manual,
    EnsTextRecord,
    EnsSubdomain,
}

/// A wallet belonging to the user
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub address: String,
    pub label: Option<String>,
    pub group_id: Option<String>,
    pub source: WalletSource,
}

/// A group of wallets (e.g., family member, business unit)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletGroup {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

/// Complete input for tax calculation and proving
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxInput {
    pub user_type: UserType,
    pub wallets: Vec<Wallet>,
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

/// Known demo contract addresses on Sepolia (lowercase)
pub mod demo_contracts {
    pub const PROFIT_MACHINE: &str = ""; // To be filled after deployment
    pub const LOSS_MACHINE: &str = "";   // To be filled after deployment
    pub const YIELD_FARM: &str = "";     // To be filled after deployment
    pub const DEMO_TOKEN: &str = "";     // To be filled after deployment
}

/// Result of categorization with confidence score
#[derive(Debug, Clone)]
pub struct CategorizationResult {
    pub category: Category,
    pub confidence: f32,
}

/// Categorize a ledger row based on heuristics
///
/// Rules:
/// 1. INTERNAL: counterparty is in user's wallet list
/// 2. GAINS: inflow from ProfitMachine or YieldFarm
/// 3. LOSSES: outflow to LossMachine (the return is categorized separately)
/// 4. FEES: small ETH outflows (likely gas)
/// 5. INCOME: other inflows
/// 6. UNKNOWN: can't determine
pub fn categorize_transaction(
    row: &LedgerRow,
    user_wallets: &[String],
) -> CategorizationResult {
    let counterparty = row.counterparty.as_ref().map(|s| s.to_lowercase());
    let user_wallets_lower: Vec<String> = user_wallets.iter().map(|w| w.to_lowercase()).collect();

    // Rule 1: Internal transfer between user's own wallets
    if let Some(ref cp) = counterparty {
        if user_wallets_lower.contains(cp) {
            return CategorizationResult {
                category: Category::Internal,
                confidence: 1.0,
            };
        }
    }

    // Rule 2: Check known demo contracts for gains
    if row.direction == Direction::In {
        if let Some(ref cp) = counterparty {
            // Inflow from ProfitMachine or YieldFarm = Gains
            if !demo_contracts::PROFIT_MACHINE.is_empty() && cp == demo_contracts::PROFIT_MACHINE {
                return CategorizationResult {
                    category: Category::Gains,
                    confidence: 0.95,
                };
            }
            if !demo_contracts::YIELD_FARM.is_empty() && cp == demo_contracts::YIELD_FARM {
                return CategorizationResult {
                    category: Category::Gains,
                    confidence: 0.95,
                };
            }
            // Inflow from LossMachine = still a return, but it's a loss scenario
            // The loss is the difference, but we categorize the return as part of a loss event
            if !demo_contracts::LOSS_MACHINE.is_empty() && cp == demo_contracts::LOSS_MACHINE {
                return CategorizationResult {
                    category: Category::Losses,
                    confidence: 0.95,
                };
            }
        }
    }

    // Rule 3: Outflows to known contracts
    if row.direction == Direction::Out {
        if let Some(ref cp) = counterparty {
            // Outflow to demo contracts - these are deposits, categorize based on contract
            if !demo_contracts::PROFIT_MACHINE.is_empty() && cp == demo_contracts::PROFIT_MACHINE {
                return CategorizationResult {
                    category: Category::Gains, // Part of a gain-generating event
                    confidence: 0.9,
                };
            }
            if !demo_contracts::LOSS_MACHINE.is_empty() && cp == demo_contracts::LOSS_MACHINE {
                return CategorizationResult {
                    category: Category::Losses, // Part of a loss-generating event
                    confidence: 0.9,
                };
            }
            if !demo_contracts::YIELD_FARM.is_empty() && cp == demo_contracts::YIELD_FARM {
                return CategorizationResult {
                    category: Category::Gains, // Staking for yield
                    confidence: 0.9,
                };
            }
        }

        // Rule 4: Small ETH outflows are likely fees
        if row.asset == "ETH" {
            if let Ok(amount) = row.amount.parse::<f64>() {
                // Less than 0.01 ETH is likely gas
                if amount < 0.01 {
                    return CategorizationResult {
                        category: Category::Fees,
                        confidence: 0.8,
                    };
                }
            }
        }
    }

    // Rule 5: Other inflows = Income (professional income)
    if row.direction == Direction::In {
        return CategorizationResult {
            category: Category::Income,
            confidence: 0.6, // Lower confidence, user should review
        };
    }

    // Rule 6: Can't determine
    CategorizationResult {
        category: Category::Unknown,
        confidence: 0.0,
    }
}

/// Categorize all rows in a ledger
pub fn categorize_ledger(ledger: &mut [LedgerRow], user_wallets: &[String]) {
    for row in ledger.iter_mut() {
        let result = categorize_transaction(row, user_wallets);
        row.category = result.category;
        row.confidence = result.confidence;
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

    #[test]
    fn test_internal_categorization() {
        let row = LedgerRow {
            chain_id: 11155111,
            owner_wallet: "0xabc".to_string(),
            tx_hash: "0x123".to_string(),
            block_time: 1234567890,
            asset: "ETH".to_string(),
            amount: "1.0".to_string(),
            decimals: 18,
            direction: Direction::In,
            counterparty: Some("0xdef".to_string()),
            category: Category::Unknown,
            confidence: 0.0,
            user_override: false,
        };

        let wallets = vec!["0xabc".to_string(), "0xdef".to_string()];
        let result = categorize_transaction(&row, &wallets);

        assert_eq!(result.category, Category::Internal);
        assert_eq!(result.confidence, 1.0);
    }

    #[test]
    fn test_small_eth_outflow_is_fee() {
        let row = LedgerRow {
            chain_id: 11155111,
            owner_wallet: "0xabc".to_string(),
            tx_hash: "0x123".to_string(),
            block_time: 1234567890,
            asset: "ETH".to_string(),
            amount: "0.005".to_string(),
            decimals: 18,
            direction: Direction::Out,
            counterparty: Some("0xcontract".to_string()),
            category: Category::Unknown,
            confidence: 0.0,
            user_override: false,
        };

        let wallets = vec!["0xabc".to_string()];
        let result = categorize_transaction(&row, &wallets);

        assert_eq!(result.category, Category::Fees);
    }
}
