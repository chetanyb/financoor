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

// Tax calculation types
export interface PriceEntry {
  asset: string;
  usd_price: string;
}

export interface TaxBreakdown {
  professional_income_inr: string;
  taxable_professional_income_inr: string;
  vda_gains_inr: string;
  vda_losses_inr: string;
  professional_tax_inr: string;
  section_87a_rebate_inr: string;
  vda_tax_inr: string;
  cess_inr: string;
  total_tax_inr: string;
}

export interface TaxResponse {
  breakdown: TaxBreakdown;
}

export interface TaxRequest {
  user_type: string;
  ledger: ApiLedgerRow[];
  prices: PriceEntry[];
  usd_inr_rate: string;
  use_44ada: boolean;
}

export async function calculateTax(request: TaxRequest): Promise<TaxResponse> {
  const response = await fetch(`${API_BASE}/tax`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to calculate tax");
  }

  return response.json();
}

// Proof generation types
export interface ProofRequest {
  user_type: string;
  ledger: ApiLedgerRow[];
  prices: PriceEntry[];
  usd_inr_rate: string;
  use_44ada: boolean;
}

export interface ProofResponse {
  ledger_commitment: string;
  total_tax_paisa: number;
  user_type_code: number;
  used_44ada: boolean;
  proof: string;
  public_values: string;
  vk_hash: string;
  note: string;
}

export async function generateProof(request: ProofRequest): Promise<ProofResponse> {
  const response = await fetch(`${API_BASE}/proofs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to generate proof");
  }

  return response.json();
}

// ENS resolution types
export interface EnsSubdomain {
  name: string;
  label: string;
  address: string | null;
}

export interface EnsResolveResponse {
  subdomains: EnsSubdomain[];
}

export async function resolveEnsSubdomains(rootName: string): Promise<EnsResolveResponse> {
  const response = await fetch(`${API_BASE}/ens/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ root_name: rootName }),
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || "Failed to resolve ENS subdomains");
  }

  return response.json();
}
