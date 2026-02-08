//! Financoor Prover - SP1 proof generation service
//!
//! This crate handles setting up the SP1 prover and generating proofs
//! for tax calculations.

use anyhow::Result;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use sp1_sdk::{include_elf, EnvProver, HashableKey, ProverClient, SP1ProofWithPublicValues, SP1ProvingKey, SP1Stdin, SP1VerifyingKey};

/// The ELF binary for the tax_zk SP1 program
pub const TAX_ZK_ELF: &[u8] = include_elf!("tax-zk");

/// Proof artifacts returned after proving
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofArtifacts {
    /// The proof bytes (base64 encoded)
    pub proof: String,
    /// Public values committed by the program (base64 encoded)
    pub public_values: String,
    /// Verification key hash (hex encoded)
    pub vk_hash: String,
    /// Total tax in paisa (extracted from public values)
    pub total_tax_paisa: u64,
    /// Ledger commitment hash (hex encoded)
    pub ledger_commitment: String,
}

/// Prover service that caches proving/verification keys
pub struct TaxProver {
    client: EnvProver,
    pk: SP1ProvingKey,
    vk: SP1VerifyingKey,
}

impl TaxProver {
    /// Create a new prover instance with cached keys
    pub fn new() -> Result<Self> {
        let client = ProverClient::from_env();

        // Setup proving and verification keys once at initialization
        tracing::info!("Setting up proving/verification keys (one-time)...");
        let (pk, vk) = client.setup(TAX_ZK_ELF);
        tracing::info!("Keys setup complete");

        Ok(Self { client, pk, vk })
    }

    /// Execute the program without generating a proof (for testing)
    pub fn execute(&self, input: &financoor_core::TaxInput) -> Result<Vec<u8>> {
        let mut stdin = SP1Stdin::new();
        stdin.write(&input);

        let (output, report) = self.client.execute(TAX_ZK_ELF, &stdin).run()?;

        tracing::info!(
            "Execution complete. Cycles: {}",
            report.total_instruction_count()
        );

        Ok(output.as_slice().to_vec())
    }

    /// Generate a proof for the given tax input
    pub fn prove(&self, input: &financoor_core::TaxInput) -> Result<ProofArtifacts> {
        let mut stdin = SP1Stdin::new();
        stdin.write(&input);

        tracing::info!("Generating Groth16 proof for on-chain verification...");

        // Generate a Groth16 proof using cached keys
        let proof: SP1ProofWithPublicValues = self
            .client
            .prove(&self.pk, &stdin)
            .groth16()
            .run()?;

        tracing::info!("Proof generated successfully");

        // Extract public values
        let public_values_bytes = proof.public_values.as_slice();

        // Parse the ABI-encoded public values to extract tax amount and commitment
        // Format: bytes32 ledgerCommitment, uint256 totalTaxPaisa, uint8 userType, bool used44ada
        let ledger_commitment = if public_values_bytes.len() >= 32 {
            hex::encode(&public_values_bytes[0..32])
        } else {
            String::new()
        };

        let total_tax_paisa = if public_values_bytes.len() >= 64 {
            // uint256 is 32 bytes, but we only need the last 8 bytes for u64
            let tax_bytes = &public_values_bytes[32..64];
            u64::from_be_bytes(tax_bytes[24..32].try_into().unwrap_or([0u8; 8]))
        } else {
            0
        };

        // Get raw proof bytes for on-chain verification
        let proof_bytes = proof.bytes();

        Ok(ProofArtifacts {
            proof: BASE64.encode(&proof_bytes),
            public_values: BASE64.encode(public_values_bytes),
            vk_hash: self.vk.bytes32(),
            total_tax_paisa,
            ledger_commitment,
        })
    }

    /// Get the verification key hash for the tax program
    pub fn get_vk_hash(&self) -> String {
        self.vk.bytes32()
    }
}

impl Default for TaxProver {
    fn default() -> Self {
        Self::new().expect("Failed to create prover")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prover_creation() {
        // Just test that we can create a prover (ELF loading works)
        // Actual proving requires more setup
        let _prover = TaxProver::new().unwrap();
    }
}
