// API client for Financoor backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ApiLedgerRow {
  chain_id: number;
  owner_wallet: string;
  tx_hash: string;
  block_time: number;
  asset: string;
  amount: string;
  decimals: number;
  direction: "in" | "out";
  counterparty: string | null;
  category: "income" | "gains" | "losses" | "fees" | "internal" | "unknown";
  confidence: number;
  user_override: boolean;
}

export interface WalletCount {
  wallet: string;
  count: number;
}

export interface TransfersResponse {
  ledger: ApiLedgerRow[];
  wallet_counts: WalletCount[];
}

export interface ApiError {
  error: string;
}

export async function fetchTransfers(wallets: string[]): Promise<TransfersResponse> {
  const response = await fetch(`${API_BASE}/transfers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ wallets }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to fetch transfers");
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
