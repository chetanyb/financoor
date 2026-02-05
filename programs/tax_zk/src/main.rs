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
pub struct TaxInput {
    pub user_type: UserType,
    pub wallets: Vec<String>,
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

    // MVP: Trivial tax calculation (real logic in Chunk 7)
    // For now, just count ledger entries * 100 paisa as placeholder
    let total_tax_paisa: u64 = (input.ledger.len() as u64) * 100_00;

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
