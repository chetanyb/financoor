//! Simple CLI to test proof generation and verification locally

use financoor_core::{Category, Direction, LedgerRow, PriceEntry, TaxInput, UserType};
use financoor_prover::TaxProver;

fn main() -> anyhow::Result<()> {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    println!("=== Financoor SP1 Proof Test ===\n");

    // Create test input
    let input = TaxInput {
        user_type: UserType::Individual,
        wallets: vec![],
        ledger: vec![
            LedgerRow {
                chain_id: 11155111, // Sepolia
                owner_wallet: "0x1234...".to_string(),
                tx_hash: "0xabc123...".to_string(),
                block_time: 1700000000,
                asset: "ETH".to_string(),
                amount: "1.5".to_string(),
                decimals: 18,
                direction: Direction::In,
                counterparty: Some("0x5678...".to_string()),
                category: Category::Income,
                confidence: 0.95,
                user_override: false,
            },
            LedgerRow {
                chain_id: 11155111,
                owner_wallet: "0x1234...".to_string(),
                tx_hash: "0xdef456...".to_string(),
                block_time: 1700100000,
                asset: "ETH".to_string(),
                amount: "0.5".to_string(),
                decimals: 18,
                direction: Direction::In,
                counterparty: Some("0x9abc...".to_string()),
                category: Category::Gains,
                confidence: 0.90,
                user_override: false,
            },
        ],
        prices: vec![PriceEntry {
            asset: "ETH".to_string(),
            usd_price: "2000.00".to_string(),
        }],
        usd_inr_rate: "83.00".to_string(),
        use_44ada: false,
    };

    // Create prover
    println!("Initializing SP1 prover...");
    let prover = TaxProver::new()?;

    // Print VK hash
    println!("VK Hash: {}", prover.get_vk_hash());
    println!();

    // Generate proof
    println!("Generating proof (this may take a while in CPU mode)...");
    let start = std::time::Instant::now();
    let artifacts = prover.prove(&input)?;
    let elapsed = start.elapsed();

    println!("\n=== Proof Generated ===");
    println!("Time: {:?}", elapsed);
    println!("Ledger Commitment: 0x{}", artifacts.ledger_commitment);
    println!("Total Tax (paisa): {}", artifacts.total_tax_paisa);
    println!("Total Tax (INR): ₹{:.2}", artifacts.total_tax_paisa as f64 / 100.0);
    println!("VK Hash: {}", artifacts.vk_hash);
    println!("Proof size: {} bytes", artifacts.proof.len());
    println!();

    // Verify proof locally
    println!("Verifying proof locally...");
    let verify_start = std::time::Instant::now();
    let valid = prover.verify(&artifacts)?;
    let verify_elapsed = verify_start.elapsed();

    println!("Verification: {} (took {:?})", if valid { "✓ VALID" } else { "✗ INVALID" }, verify_elapsed);

    Ok(())
}
