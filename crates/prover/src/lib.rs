//! Financoor Prover - SP1 proof generation service
//!
//! This crate handles setting up the SP1 prover and generating proofs
//! for tax calculations.

use anyhow::Result;
use sp1_sdk::{include_elf, ProverClient, SP1Stdin};

/// The ELF binary for the tax_zk SP1 program
pub const TAX_ZK_ELF: &[u8] = include_elf!("tax-zk");

/// Prover service that caches proving/verification keys
pub struct TaxProver {
    client: ProverClient,
}

impl TaxProver {
    /// Create a new prover instance
    pub fn new() -> Result<Self> {
        let client = ProverClient::from_env();
        Ok(Self { client })
    }

    /// Generate a proof for the given tax input
    pub fn prove(&self, input: &financoor_core::TaxInput) -> Result<Vec<u8>> {
        let mut stdin = SP1Stdin::new();
        stdin.write(&input);

        // For now, just execute to verify the program works
        // Full proving will be enabled in Chunk 8
        let (_, report) = self.client.execute(TAX_ZK_ELF, &stdin).run()?;

        tracing::info!("Execution report: {:?}", report);

        // Return empty proof for now (placeholder)
        Ok(vec![])
    }
}

impl Default for TaxProver {
    fn default() -> Self {
        Self::new().expect("Failed to create prover")
    }
}
