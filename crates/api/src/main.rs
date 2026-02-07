//! Financoor API Server
//!
//! Axum-based backend for wallet data fetching, categorization, and proof generation.

mod alchemy;
mod ens;

use std::sync::Arc;

use axum::{
    extract::State,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use financoor_core::{calculate_tax, categorize_ledger, LedgerRow, PriceEntry, TaxBreakdown, TaxInput, UserType};
use financoor_prover::TaxProver;
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::alchemy::AlchemyClient;
use crate::ens::EnsResolver;

struct AppState {
    alchemy: AlchemyClient,
    ens: EnsResolver,
    prover: TaxProver,
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
    State(state): State<Arc<AppState>>,
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

    // Build TaxInput for the SP1 prover
    let input = TaxInput {
        user_type,
        wallets: vec![],
        ledger: payload.ledger,
        prices: payload.prices,
        usd_inr_rate: payload.usd_inr_rate.clone(),
        use_44ada: payload.use_44ada,
    };

    // Debug: Log categories being sent to prover
    tracing::info!("=== PROOF REQUEST DEBUG ===");
    tracing::info!("Ledger rows: {}", input.ledger.len());
    for (i, row) in input.ledger.iter().enumerate() {
        tracing::info!("  Row {}: asset={}, amount={}, category={:?}, direction={:?}",
            i, row.asset, row.amount, row.category, row.direction);
    }
    tracing::info!("Prices: {:?}", input.prices);
    tracing::info!("USD/INR rate: {}", input.usd_inr_rate);
    tracing::info!("===========================");

    // Generate real ZK proof using SP1
    tracing::info!("Generating SP1 proof...");
    let proof_artifacts = state.prover.prove(&input).map_err(|e| {
        tracing::error!("Proof generation failed: {}", e);
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Proof generation failed: {}", e),
            }),
        )
    })?;
    tracing::info!("SP1 proof generated successfully");

    Ok(Json(ProofResponse {
        ledger_commitment: proof_artifacts.ledger_commitment,
        total_tax_paisa: proof_artifacts.total_tax_paisa,
        user_type_code,
        used_44ada: payload.use_44ada,
        proof: proof_artifacts.proof,
        public_values: proof_artifacts.public_values,
        vk_hash: proof_artifacts.vk_hash,
        note: "Real SP1 ZK proof generated".to_string(),
    }))
}

// ============================================================================
// ENS SUBDOMAIN RESOLUTION
// ============================================================================

#[derive(Deserialize)]
struct EnsResolveRequest {
    root_name: String,
}

#[derive(Serialize)]
struct EnsResolveResponse {
    subdomains: Vec<EnsSubdomain>,
}

#[derive(Serialize)]
struct EnsSubdomain {
    name: String,
    label: String,
    address: String,
}

async fn resolve_ens(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<EnsResolveRequest>,
) -> Result<Json<EnsResolveResponse>, (StatusCode, Json<ErrorResponse>)> {
    if payload.root_name.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(ErrorResponse {
                error: "Root name is required".to_string(),
            }),
        ));
    }

    match state.ens.resolve_subdomains(&payload.root_name).await {
        Ok(subdomains) => {
            let subdomains: Vec<EnsSubdomain> = subdomains
                .into_iter()
                .filter_map(|s| {
                    s.address.map(|addr| EnsSubdomain {
                        name: s.name,
                        label: s.label,
                        address: addr,
                    })
                })
                .collect();

            Ok(Json(EnsResolveResponse { subdomains }))
        }
        Err(e) => {
            tracing::error!("Failed to resolve ENS subdomains: {}", e);
            Err((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    error: format!("Failed to resolve ENS: {}", e),
                }),
            ))
        }
    }
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

    // Initialize SP1 prover (this loads proving parameters)
    tracing::info!("Initializing SP1 prover...");
    let prover = TaxProver::new()?;
    tracing::info!("SP1 prover initialized successfully");
    tracing::info!("VK hash: {}", prover.get_vk_hash());

    let state = Arc::new(AppState {
        alchemy: AlchemyClient::new(alchemy_api_key),
        ens: EnsResolver::new(),
        prover,
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
        .route("/ens/resolve", post(resolve_ens))
        .layer(cors)
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    tracing::info!("🚀 Financoor API running on http://localhost:3001");

    axum::serve(listener, app).await?;

    Ok(())
}
