//! ENS (Ethereum Name Service) subdomain resolver
//!
//! Resolves a root ENS name to its subdomains and their addresses
//! via the ENS subgraph.

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};

/// ENS Subgraph URL - uses Sepolia by default for testnet development
/// Mainnet: https://api.thegraph.com/subgraphs/name/ensdomains/ens
/// Sepolia: https://api.studio.thegraph.com/query/49574/enssepolia/version/latest
fn get_subgraph_url() -> String {
    std::env::var("ENS_SUBGRAPH_URL").unwrap_or_else(|_| {
        // Default to Sepolia for development/hackathon
        "https://api.studio.thegraph.com/query/49574/enssepolia/version/latest".to_string()
    })
}

/// Resolved subdomain with its address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedSubdomain {
    /// Full ENS name (e.g., "alice.family.eth")
    pub name: String,
    /// Label (subdomain part, e.g., "alice")
    pub label: String,
    /// Resolved Ethereum address (if any)
    pub address: Option<String>,
}

/// ENS resolver client
pub struct EnsResolver {
    client: reqwest::Client,
}

#[derive(Debug, Serialize)]
struct GraphQLQuery {
    query: String,
    variables: serde_json::Value,
}

#[derive(Debug, Deserialize)]
struct GraphQLResponse {
    data: Option<DomainsData>,
    errors: Option<Vec<GraphQLError>>,
}

#[derive(Debug, Deserialize)]
struct GraphQLError {
    message: String,
}

#[derive(Debug, Deserialize)]
struct DomainsData {
    domains: Vec<DomainNode>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DomainNode {
    name: Option<String>,
    label_name: Option<String>,
    resolved_address: Option<AddressNode>,
    subdomains: Option<Vec<SubdomainNode>>,
}

#[derive(Debug, Deserialize)]
struct AddressNode {
    id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SubdomainNode {
    name: Option<String>,
    label_name: Option<String>,
    resolved_address: Option<AddressNode>,
}

impl EnsResolver {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// Resolve a root ENS name to its subdomains
    ///
    /// # Arguments
    /// * `root_name` - The root ENS name (e.g., "family.eth")
    ///
    /// # Returns
    /// A list of resolved subdomains with their addresses
    pub async fn resolve_subdomains(&self, root_name: &str) -> Result<Vec<ResolvedSubdomain>> {
        // Normalize the root name
        let root_name = root_name.trim().to_lowercase();
        let subgraph_url = get_subgraph_url();
        eprintln!("[ENS] Resolving '{}' via subgraph: {}", root_name, subgraph_url);

        // GraphQL query to get domain and its subdomains
        let query = r#"
            query GetSubdomains($name: String!) {
                domains(where: { name: $name }) {
                    name
                    labelName
                    resolvedAddress {
                        id
                    }
                    subdomains(first: 100) {
                        name
                        labelName
                        resolvedAddress {
                            id
                        }
                    }
                }
            }
        "#;

        let request = GraphQLQuery {
            query: query.to_string(),
            variables: serde_json::json!({ "name": root_name }),
        };

        let response: GraphQLResponse = self
            .client
            .post(&subgraph_url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        if let Some(errors) = response.errors {
            if !errors.is_empty() {
                return Err(anyhow!("ENS subgraph error: {}", errors[0].message));
            }
        }

        let data = response.data.ok_or_else(|| anyhow!("No data returned from ENS subgraph"))?;

        let mut results: Vec<ResolvedSubdomain> = Vec::new();

        for domain in data.domains {
            // Add the root domain if it has a resolved address
            if let (Some(name), Some(resolved)) = (&domain.name, &domain.resolved_address) {
                results.push(ResolvedSubdomain {
                    name: name.clone(),
                    label: domain.label_name.clone().unwrap_or_else(|| name.clone()),
                    address: Some(resolved.id.clone()),
                });
            }

            // Add subdomains
            if let Some(subdomains) = domain.subdomains {
                for subdomain in subdomains {
                    if let Some(name) = subdomain.name {
                        results.push(ResolvedSubdomain {
                            name: name.clone(),
                            label: subdomain.label_name.unwrap_or_else(|| name.clone()),
                            address: subdomain.resolved_address.map(|a| a.id),
                        });
                    }
                }
            }
        }

        // Return all subdomains, including those without resolved addresses
        // The frontend will handle displaying them appropriately
        Ok(results)
    }
}

impl Default for EnsResolver {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires network access
    async fn test_resolve_vitalik_eth() {
        let resolver = EnsResolver::new();
        let result = resolver.resolve_subdomains("vitalik.eth").await;
        // May or may not have subdomains, but should not error
        assert!(result.is_ok());
    }
}
