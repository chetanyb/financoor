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
        .layer(cors)
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    tracing::info!("🚀 Financoor API running on http://localhost:3001");

    axum::serve(listener, app).await?;

    Ok(())
}
