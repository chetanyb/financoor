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
use financoor_core::LedgerRow;
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

    Ok(Json(TransfersResponse {
        ledger: all_ledger,
        wallet_counts,
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
        .layer(cors)
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001").await?;
    tracing::info!("🚀 Financoor API running on http://localhost:3001");

    axum::serve(listener, app).await?;

    Ok(())
}
