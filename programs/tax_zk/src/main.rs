//! Financoor Tax ZK Program
//!
//! This SP1 program computes tax over a committed ledger and outputs
//! public values that can be verified on-chain.

#![no_main]
sp1_zkvm::entrypoint!(main);

use alloy_sol_types::{sol, SolType};
use serde::{Deserialize, Serialize};
use sp1_zkvm::syscalls;

// Re-define types here since we can't easily share with core in zkVM
// (In production, we'd use a no_std compatible shared crate)

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum UserType {
    Individual,
    Huf,
    Corporate,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Category {
    Income,
    Gains,
    Losses,
    Fees,
    Internal,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    In,
    Out,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LedgerRow {
    pub chain_id: u64,
    pub owner_wallet: String,
    pub tx_hash: String,
    pub block_time: u64,
    pub asset: String,
    pub amount: String,
    pub decimals: u8,
    pub direction: Direction,
    pub counterparty: Option<String>,
    pub category: Category,
    pub confidence: f32,
    pub user_override: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PriceEntry {
    pub asset: String,
    pub usd_price: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: String,
    pub address: String,
    pub label: Option<String>,
    pub group_id: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxInput {
    pub user_type: UserType,
    pub wallets: Vec<Wallet>,
    pub ledger: Vec<LedgerRow>,
    pub prices: Vec<PriceEntry>,
    pub usd_inr_rate: String,
    pub use_44ada: bool,
}

// ABI-encodable output struct
sol! {
    struct TaxProofPublicValues {
        bytes32 ledgerCommitment;
        uint256 totalTaxPaisa;
        uint8 userType;
        bool used44ada;
    }
}

// ============================================================================
// TAX CALCULATION (duplicated from core for zkVM compatibility)
// ============================================================================

/// New regime tax slabs for AY 2026-27 (Individual/HUF)
const NEW_REGIME_SLABS: [(u64, u64, u64); 7] = [
    (0, 400_000, 0),           // Up to 4L: 0%
    (400_001, 800_000, 5),     // 4L-8L: 5%
    (800_001, 1_200_000, 10),  // 8L-12L: 10%
    (1_200_001, 1_600_000, 15), // 12L-16L: 15%
    (1_600_001, 2_000_000, 20), // 16L-20L: 20%
    (2_000_001, 2_400_000, 25), // 20L-24L: 25%
    (2_400_001, u64::MAX, 30),  // Above 24L: 30%
];

fn calculate_slab_tax(taxable_income: u64) -> u64 {
    let mut tax: u64 = 0;

    for (lower, upper, rate) in NEW_REGIME_SLABS.iter() {
        if taxable_income > *lower {
            let amount_in_slab = if taxable_income >= *upper {
                upper - lower
            } else {
                taxable_income.saturating_sub(*lower)
            };
            tax += (amount_in_slab * rate) / 100;
        }

        if taxable_income <= *upper {
            break;
        }
    }

    tax
}

fn parse_amount(s: &str) -> u64 {
    // Parse as float then convert to paisa (x100)
    let f: f64 = s.parse().unwrap_or(0.0);
    (f * 100.0) as u64
}

fn amount_to_inr_paisa(
    amount: &str,
    asset: &str,
    prices: &[PriceEntry],
    usd_inr_rate: u64, // in paisa per USD
) -> u64 {
    let amount_val = parse_amount(amount);

    // Find USD price for this asset (in cents)
    let usd_price_cents: u64 = prices
        .iter()
        .find(|p| p.asset == asset)
        .map(|p| parse_amount(&p.usd_price))
        .unwrap_or(100); // Default $1.00

    // amount * usd_price * usd_inr / (100 * 100) to normalize
    (amount_val * usd_price_cents * usd_inr_rate) / (100 * 100 * 100)
}

fn calculate_tax(input: &TaxInput) -> u64 {
    let usd_inr_rate = parse_amount(&input.usd_inr_rate);

    // Sum up amounts by category (all in paisa)
    let mut professional_income: u64 = 0;
    let mut vda_gains: u64 = 0;

    for row in &input.ledger {
        let inr_value = amount_to_inr_paisa(&row.amount, &row.asset, &input.prices, usd_inr_rate);

        match row.category {
            Category::Income => {
                if matches!(row.direction, Direction::In) {
                    professional_income += inr_value;
                }
            }
            Category::Gains => {
                if matches!(row.direction, Direction::In) {
                    vda_gains += inr_value;
                }
            }
            // Losses, fees, internal, unknown don't add to taxable in MVP
            _ => {}
        }
    }

    // Apply 44ADA if enabled (Individual only)
    let taxable_professional_income = if input.use_44ada && matches!(input.user_type, UserType::Individual) {
        professional_income / 2 // 50% presumptive
    } else {
        professional_income
    };

    // Calculate professional income tax
    let professional_tax = match input.user_type {
        UserType::Individual | UserType::Huf => {
            calculate_slab_tax(taxable_professional_income / 100) * 100 // Convert to/from INR
        }
        UserType::Corporate => {
            // 22% + 10% surcharge = 24.2%
            (taxable_professional_income * 242) / 1000
        }
    };

    // VDA tax at 30%
    let vda_tax = (vda_gains * 30) / 100;

    // Total before cess
    let total_before_cess = professional_tax + vda_tax;

    // Health & Education Cess at 4%
    let cess = (total_before_cess * 4) / 100;

    // Total tax payable (in paisa)
    total_before_cess + cess
}

/// Simple SHA256 hash using SP1 syscalls
fn sha256_hash(data: &[u8]) -> [u8; 32] {
    let mut state = [
        0x6a09e667u32, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];

    let mut i = 0;
    while i + 64 <= data.len() {
        let mut w = [0u32; 64];
        for j in 0..16 {
            let idx = i + j * 4;
            w[j] = ((data[idx] as u32) << 24)
                | ((data.get(idx + 1).copied().unwrap_or(0) as u32) << 16)
                | ((data.get(idx + 2).copied().unwrap_or(0) as u32) << 8)
                | (data.get(idx + 3).copied().unwrap_or(0) as u32);
        }

        syscalls::syscall_sha256_extend(&mut w);
        syscalls::syscall_sha256_compress(&mut w, &mut state);
        i += 64;
    }

    // Pad and finalize
    let mut final_block = [0u8; 64];
    let remaining = data.len() - i;
    if remaining > 0 {
        final_block[..remaining].copy_from_slice(&data[i..]);
    }
    final_block[remaining] = 0x80;

    let mut w = [0u32; 64];
    if remaining < 56 {
        for j in 0..14 {
            let idx = j * 4;
            w[j] = ((final_block[idx] as u32) << 24)
                | ((final_block[idx + 1] as u32) << 16)
                | ((final_block[idx + 2] as u32) << 8)
                | (final_block[idx + 3] as u32);
        }
        let len_bits = (data.len() as u64) * 8;
        w[14] = (len_bits >> 32) as u32;
        w[15] = len_bits as u32;

        syscalls::syscall_sha256_extend(&mut w);
        syscalls::syscall_sha256_compress(&mut w, &mut state);
    } else {
        for j in 0..16 {
            let idx = j * 4;
            w[j] = ((final_block[idx] as u32) << 24)
                | ((final_block[idx + 1] as u32) << 16)
                | ((final_block[idx + 2] as u32) << 8)
                | (final_block[idx + 3] as u32);
        }

        syscalls::syscall_sha256_extend(&mut w);
        syscalls::syscall_sha256_compress(&mut w, &mut state);

        w = [0u32; 64];
        let len_bits = (data.len() as u64) * 8;
        w[14] = (len_bits >> 32) as u32;
        w[15] = len_bits as u32;

        syscalls::syscall_sha256_extend(&mut w);
        syscalls::syscall_sha256_compress(&mut w, &mut state);
    }

    let mut result = [0u8; 32];
    for i in 0..8 {
        result[i * 4] = (state[i] >> 24) as u8;
        result[i * 4 + 1] = (state[i] >> 16) as u8;
        result[i * 4 + 2] = (state[i] >> 8) as u8;
        result[i * 4 + 3] = state[i] as u8;
    }
    result
}

pub fn main() {
    // Read input from the prover
    let input: TaxInput = sp1_zkvm::io::read();

    // Compute commitment to the ledger (SHA256 hash)
    let ledger_json = serde_json::to_string(&input.ledger).unwrap();
    let ledger_commitment = sha256_hash(ledger_json.as_bytes());

    // Calculate tax using the same logic as the core crate
    let total_tax_paisa = calculate_tax(&input);

    let user_type_code = match input.user_type {
        UserType::Individual => 0u8,
        UserType::Huf => 1u8,
        UserType::Corporate => 2u8,
    };

    // Encode public values for on-chain verification
    let public_values = TaxProofPublicValues {
        ledgerCommitment: alloy_sol_types::private::FixedBytes(ledger_commitment),
        totalTaxPaisa: alloy_sol_types::private::U256::from(total_tax_paisa),
        userType: user_type_code,
        used44ada: input.use_44ada,
    };

    let encoded = TaxProofPublicValues::abi_encode(&public_values);
    sp1_zkvm::io::commit_slice(&encoded);
}
