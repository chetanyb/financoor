//! Financoor API Server
//!
//! Axum-based backend for wallet data fetching, categorization, and proof generation.

mod alchemy;
mod ens;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use axum::{
    extract::{Path, State},
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

// ============================================================================
// PROOF JOB TYPES
// ============================================================================

#[derive(Clone, Serialize)]
#[serde(tag = "status")]
enum ProofJobStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "done")]
    Done { result: ProofResult },
    #[serde(rename = "error")]
    Error { error: String },
}

#[derive(Clone, Serialize)]
struct ProofResult {
    ledger_commitment: String,
    total_tax_paisa: u64,
    user_type_code: u8,
    used_44ada: bool,
    proof: String,
    public_values: String,
    vk_hash: String,
}

type ProofJobs = Arc<RwLock<HashMap<String, ProofJobStatus>>>;

struct AppState {
    alchemy: AlchemyClient,
    ens: EnsResolver,
    prover: Arc<TaxProver>,
    jobs: ProofJobs,
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
struct ProofSubmitResponse {
    job_id: String,
}

#[derive(Serialize)]
struct ProofStatusResponse {
    job_id: String,
    #[serde(flatten)]
    status: ProofJobStatus,
}

async fn submit_proof(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ProofRequest>,
) -> Result<Json<ProofSubmitResponse>, (StatusCode, Json<ErrorResponse>)> {
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

    // Generate job ID
    let job_id = format!("{:x}", rand::random::<u64>());

    // Store job as pending
    {
        let mut jobs = state.jobs.write().await;
        jobs.insert(job_id.clone(), ProofJobStatus::Pending);
    }

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
    tracing::info!("Job ID: {}", job_id);
    tracing::info!("Ledger rows: {}", input.ledger.len());
    for (i, row) in input.ledger.iter().enumerate() {
        tracing::info!("  Row {}: asset={}, amount={}, category={:?}, direction={:?}",
            i, row.asset, row.amount, row.category, row.direction);
    }
    tracing::info!("Prices: {:?}", input.prices);
    tracing::info!("USD/INR rate: {}", input.usd_inr_rate);
    tracing::info!("===========================");

    // Spawn background task to generate proof
    let prover = state.prover.clone();
    let jobs = state.jobs.clone();
    let job_id_clone = job_id.clone();
    let used_44ada = payload.use_44ada;

    tokio::spawn(async move {
        tracing::info!("Starting proof generation for job {}", job_id_clone);

        // Run proof generation in blocking task (it's CPU-intensive)
        let result = tokio::task::spawn_blocking(move || {
            prover.prove(&input)
        }).await;

        let status = match result {
            Ok(Ok(proof_artifacts)) => {
                tracing::info!("Proof generated successfully for job {}", job_id_clone);
                ProofJobStatus::Done {
                    result: ProofResult {
                        ledger_commitment: proof_artifacts.ledger_commitment,
                        total_tax_paisa: proof_artifacts.total_tax_paisa,
                        user_type_code,
                        used_44ada,
                        proof: proof_artifacts.proof,
                        public_values: proof_artifacts.public_values,
                        vk_hash: proof_artifacts.vk_hash,
                    },
                }
            }
            Ok(Err(e)) => {
                tracing::error!("Proof generation failed for job {}: {}", job_id_clone, e);
                ProofJobStatus::Error {
                    error: format!("Proof generation failed: {}", e),
                }
            }
            Err(e) => {
                tracing::error!("Task panic for job {}: {}", job_id_clone, e);
                ProofJobStatus::Error {
                    error: format!("Task panic: {}", e),
                }
            }
        };

        // Update job status
        let mut jobs = jobs.write().await;
        jobs.insert(job_id_clone, status);
    });

    Ok(Json(ProofSubmitResponse { job_id }))
}

async fn get_proof_status(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<String>,
) -> Result<Json<ProofStatusResponse>, (StatusCode, Json<ErrorResponse>)> {
    let jobs = state.jobs.read().await;

    match jobs.get(&job_id) {
        Some(status) => Ok(Json(ProofStatusResponse {
            job_id,
            status: status.clone(),
        })),
        None => Err((
            StatusCode::NOT_FOUND,
            Json(ErrorResponse {
                error: format!("Job not found: {}", job_id),
            }),
        )),
    }
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
    let prover = Arc::new(TaxProver::new()?);
    tracing::info!("SP1 prover initialized successfully");
    tracing::info!("VK hash: {}", prover.get_vk_hash());

    // Initialize job storage
    let jobs: ProofJobs = Arc::new(RwLock::new(HashMap::new()));

    let state = Arc::new(AppState {
        alchemy: AlchemyClient::new(alchemy_api_key),
        ens: EnsResolver::new(),
        prover,
        jobs,
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
        .route("/proofs", post(submit_proof))
        .route("/proofs/{job_id}", get(get_proof_status))
        .route("/ens/resolve", post(resolve_ens))
        .layer(cors)
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    tracing::info!("🚀 Financoor API running on http://localhost:3001");

    axum::serve(listener, app).await?;

    Ok(())
}
