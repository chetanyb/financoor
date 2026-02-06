//! Financoor API Server
//!
//! Axum-based backend for wallet data fetching, categorization, and proof generation.

mod alchemy;

use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use financoor_core::{calculate_tax, categorize_ledger, LedgerRow, PriceEntry, TaxBreakdown, TaxInput, UserType};
use sha2::{Sha256, Digest};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::alchemy::AlchemyClient;

struct AppState {
    alchemy: AlchemyClient,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    version: &'static str,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[derive(Deserialize)]
struct TransfersRequest {
    wallets: Vec<String>,
}

#[derive(Serialize)]
struct TransfersResponse {
    ledger: Vec<LedgerRow>,
    wallet_counts: Vec<WalletCount>,
}

#[derive(Serialize)]
struct WalletCount {
    wallet: String,
    count: usize,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

async fn get_transfers(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TransfersRequest>,
) -> Result<Json<TransfersResponse>, (StatusCode, Json<ErrorResponse>)> {
    if payload.wallets.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "No wallets provided".to_string(),
            }),
        ));
    }

    let mut all_ledger: Vec<LedgerRow> = Vec::new();
    let mut wallet_counts: Vec<WalletCount> = Vec::new();

    for wallet in &payload.wallets {
        match state.alchemy.get_transfers(wallet).await {
            Ok(ledger) => {
                let count = ledger.len();
                wallet_counts.push(WalletCount {
                    wallet: wallet.clone(),
                    count,
                });
                all_ledger.extend(ledger);
            }
            Err(e) => {
                tracing::error!("Failed to fetch transfers for {}: {}", wallet, e);
                return Err((
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse {
                        error: format!("Failed to fetch transfers for {}: {}", wallet, e),
                    }),
                ));
            }
        }
    }

    // Sort all ledger entries by block time
    all_ledger.sort_by(|a, b| a.block_time.cmp(&b.block_time));

    // Categorize transactions based on heuristics
    categorize_ledger(&mut all_ledger, &payload.wallets);

    Ok(Json(TransfersResponse {
        ledger: all_ledger,
        wallet_counts,
    }))
}

#[derive(Deserialize)]
struct TaxRequest {
    user_type: String,
    ledger: Vec<LedgerRow>,
    prices: Vec<PriceEntry>,
    usd_inr_rate: String,
    use_44ada: bool,
}

#[derive(Serialize)]
struct TaxResponse {
    breakdown: TaxBreakdown,
}

async fn calculate_tax_endpoint(
    Json(payload): Json<TaxRequest>,
) -> Result<Json<TaxResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Parse user type
    let user_type = match payload.user_type.as_str() {
        "individual" => UserType::Individual,
        "huf" => UserType::Huf,
        "corporate" => UserType::Corporate,
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!("Invalid user type: {}", payload.user_type),
                }),
            ));
        }
    };

    let input = TaxInput {
        user_type,
        wallets: vec![], // Not needed for calculation
        ledger: payload.ledger,
        prices: payload.prices,
        usd_inr_rate: payload.usd_inr_rate,
        use_44ada: payload.use_44ada,
    };

    let breakdown = calculate_tax(&input);

    Ok(Json(TaxResponse { breakdown }))
}

// ============================================================================
// PROOF GENERATION
// ============================================================================

#[derive(Deserialize)]
struct ProofRequest {
    user_type: String,
    ledger: Vec<LedgerRow>,
    prices: Vec<PriceEntry>,
    usd_inr_rate: String,
    use_44ada: bool,
}

#[derive(Serialize)]
struct ProofResponse {
    /// Ledger commitment (SHA256 hash, hex encoded)
    ledger_commitment: String,
    /// Total tax in paisa
    total_tax_paisa: u64,
    /// User type code (0=Individual, 1=HUF, 2=Corporate)
    user_type_code: u8,
    /// Whether 44ADA was used
    used_44ada: bool,
    /// Mock proof data (base64 encoded)
    /// In production, this would be actual SP1 proof bytes
    proof: String,
    /// Public values (base64 encoded ABI-encoded struct)
    public_values: String,
    /// Verification key hash (for on-chain verification)
    vk_hash: String,
    /// Note about proof status
    note: String,
}

async fn generate_proof(
    Json(payload): Json<ProofRequest>,
) -> Result<Json<ProofResponse>, (StatusCode, Json<ErrorResponse>)> {
    // Parse user type
    let user_type = match payload.user_type.as_str() {
        "individual" => UserType::Individual,
        "huf" => UserType::Huf,
        "corporate" => UserType::Corporate,
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                Json(ErrorResponse {
                    error: format!("Invalid user type: {}", payload.user_type),
                }),
            ));
        }
    };

    let user_type_code = match user_type {
        UserType::Individual => 0u8,
        UserType::Huf => 1u8,
        UserType::Corporate => 2u8,
    };

    // Compute ledger commitment (SHA256 hash of JSON-serialized ledger)
    let ledger_json = serde_json::to_string(&payload.ledger).map_err(|e| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Failed to serialize ledger: {}", e),
            }),
        )
    })?;

    let mut hasher = Sha256::new();
    hasher.update(ledger_json.as_bytes());
    let ledger_commitment = hex::encode(hasher.finalize());

    // Calculate tax
    let input = TaxInput {
        user_type,
        wallets: vec![],
        ledger: payload.ledger,
        prices: payload.prices,
        usd_inr_rate: payload.usd_inr_rate.clone(),
        use_44ada: payload.use_44ada,
    };

    let breakdown = calculate_tax(&input);
    let total_tax_inr: f64 = breakdown.total_tax_inr.parse().unwrap_or(0.0);
    let total_tax_paisa = (total_tax_inr * 100.0) as u64;

    // For hackathon MVP: generate mock proof data
    // In production, this would call the actual SP1 prover
    let mock_proof = format!(
        "MOCK_PROOF_v1:commitment={},tax={},user={},44ada={}",
        &ledger_commitment[..16],
        total_tax_paisa,
        user_type_code,
        payload.use_44ada
    );

    // Encode public values (simplified ABI encoding for demo)
    // Real encoding would use alloy-sol-types
    let mut public_values = Vec::new();
    public_values.extend_from_slice(&hex::decode(&ledger_commitment).unwrap_or_default());
    public_values.extend_from_slice(&[0u8; 24]); // Padding for uint256
    public_values.extend_from_slice(&total_tax_paisa.to_be_bytes());
    public_values.push(user_type_code);
    public_values.push(if payload.use_44ada { 1 } else { 0 });

    use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

    Ok(Json(ProofResponse {
        ledger_commitment,
        total_tax_paisa,
        user_type_code,
        used_44ada: payload.use_44ada,
        proof: BASE64.encode(mock_proof.as_bytes()),
        public_values: BASE64.encode(&public_values),
        vk_hash: "0x".to_string() + &"0".repeat(64), // Mock VK hash
        note: "Demo proof - actual SP1 proving requires local prover setup".to_string(),
    }))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load .env file (ignore if not found)
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "financoor_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Get Alchemy API key from environment
    let alchemy_api_key = std::env::var("ALCHEMY_API_KEY")
        .unwrap_or_else(|_| {
            tracing::warn!("ALCHEMY_API_KEY not set, using demo key (rate limited)");
            "demo".to_string()
        });

    let state = Arc::new(AppState {
        alchemy: AlchemyClient::new(alchemy_api_key),
    });

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .route("/health", get(health))
        .route("/transfers", post(get_transfers))
        .route("/tax", post(calculate_tax_endpoint))
        .route("/proofs", post(generate_proof))
        .layer(cors)
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    tracing::info!("🚀 Financoor API running on http://localhost:3001");

    axum::serve(listener, app).await?;

    Ok(())
}
