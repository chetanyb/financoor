//! Alchemy Transfers API client for fetching wallet transactions

use anyhow::{anyhow, Result};
use financoor_core::{Category, Direction, LedgerRow};
use serde::{Deserialize, Serialize};

const ALCHEMY_SEPOLIA_URL: &str = "https://eth-sepolia.g.alchemy.com/v2";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct GetAssetTransfersParams {
    from_block: String,
    to_block: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    from_address: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    to_address: Option<String>,
    category: Vec<String>,
    with_metadata: bool,
    max_count: String,
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest {
    id: u32,
    jsonrpc: &'static str,
    method: &'static str,
    params: Vec<GetAssetTransfersParams>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse {
    result: Option<TransfersResult>,
    error: Option<JsonRpcError>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcError {
    message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TransfersResult {
    transfers: Vec<AlchemyTransfer>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AlchemyTransfer {
    block_num: String,
    hash: String,
    from: String,
    to: Option<String>,
    value: Option<f64>,
    asset: Option<String>,
    category: String,
    metadata: TransferMetadata,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TransferMetadata {
    block_timestamp: String,
}

pub struct AlchemyClient {
    client: reqwest::Client,
    api_key: String,
}

impl AlchemyClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            api_key,
        }
    }

    /// Fetch all transfers for a wallet address on Sepolia
    pub async fn get_transfers(&self, wallet: &str) -> Result<Vec<LedgerRow>> {
        let url = format!("{}/{}", ALCHEMY_SEPOLIA_URL, self.api_key);

        // Fetch incoming transfers
        let incoming = self.fetch_transfers(&url, None, Some(wallet.to_string())).await?;

        // Fetch outgoing transfers
        let outgoing = self.fetch_transfers(&url, Some(wallet.to_string()), None).await?;

        // Combine and normalize
        let mut ledger: Vec<LedgerRow> = Vec::new();

        for transfer in incoming {
            if let Some(row) = self.normalize_transfer(&transfer, wallet, Direction::In) {
                ledger.push(row);
            }
        }

        for transfer in outgoing {
            if let Some(row) = self.normalize_transfer(&transfer, wallet, Direction::Out) {
                ledger.push(row);
            }
        }

        // Sort by block time
        ledger.sort_by(|a, b| a.block_time.cmp(&b.block_time));

        Ok(ledger)
    }

    async fn fetch_transfers(
        &self,
        url: &str,
        from_address: Option<String>,
        to_address: Option<String>,
    ) -> Result<Vec<AlchemyTransfer>> {
        let params = GetAssetTransfersParams {
            from_block: "0x0".to_string(),
            to_block: "latest".to_string(),
            from_address,
            to_address,
            category: vec![
                "external".to_string(),
                "erc20".to_string(),
                "erc721".to_string(),
                "erc1155".to_string(),
            ],
            with_metadata: true,
            max_count: "0x3e8".to_string(), // 1000
        };

        let request = JsonRpcRequest {
            id: 1,
            jsonrpc: "2.0",
            method: "alchemy_getAssetTransfers",
            params: vec![params],
        };

        let response: JsonRpcResponse = self
            .client
            .post(url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        if let Some(error) = response.error {
            return Err(anyhow!("Alchemy API error: {}", error.message));
        }

        Ok(response
            .result
            .map(|r| r.transfers)
            .unwrap_or_default())
    }

    fn normalize_transfer(
        &self,
        transfer: &AlchemyTransfer,
        owner_wallet: &str,
        direction: Direction,
    ) -> Option<LedgerRow> {
        let value = transfer.value.unwrap_or(0.0);
        if value == 0.0 {
            return None;
        }

        // Parse block timestamp
        let block_time = parse_timestamp(&transfer.metadata.block_timestamp).unwrap_or(0);

        // Determine asset and decimals
        let (asset, decimals) = match transfer.category.as_str() {
            "external" => ("ETH".to_string(), 18u8),
            _ => (
                transfer.asset.clone().unwrap_or_else(|| "UNKNOWN".to_string()),
                18u8, // Default to 18, could be improved with token metadata lookup
            ),
        };

        // Determine counterparty
        let counterparty = match direction {
            Direction::In => Some(transfer.from.clone()),
            Direction::Out => transfer.to.clone(),
        };

        Some(LedgerRow {
            chain_id: 11155111, // Sepolia
            owner_wallet: owner_wallet.to_lowercase(),
            tx_hash: transfer.hash.clone(),
            block_time,
            asset,
            amount: value.to_string(),
            decimals,
            direction,
            counterparty,
            category: Category::Unknown, // Will be categorized later
            confidence: 0.0,
            user_override: false,
        })
    }
}

fn parse_timestamp(timestamp: &str) -> Option<u64> {
    // Alchemy returns ISO 8601 timestamps like "2024-01-15T10:30:00.000Z"
    // Parse to unix timestamp
    chrono::DateTime::parse_from_rfc3339(timestamp)
        .ok()
        .map(|dt| dt.timestamp() as u64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_timestamp() {
        let ts = parse_timestamp("2024-01-15T10:30:00.000Z");
        assert!(ts.is_some());
    }
}
