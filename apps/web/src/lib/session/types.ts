// Session state types for Financoor

export type UserType = "individual" | "huf" | "corporate";

export interface Wallet {
  id: string;
  address: string;
  label?: string;
  groupId?: string;
}

export interface WalletGroup {
  id: string;
  name: string;
  description?: string;
}

export type Category =
  | "income"
  | "gains"
  | "losses"
  | "fees"
  | "internal"
  | "unknown";

export type Direction = "in" | "out";

export interface LedgerRow {
  id: string;
  chainId: number;
  ownerWallet: string;
  txHash: string;
  blockTime: number;
  asset: string;
  amount: string;
  decimals: number;
  direction: Direction;
  counterparty?: string;
  category: Category;
  confidence: number;
  userOverride: boolean;
}

export interface CategoryOverride {
  ledgerRowId: string;
  category: Category;
}

export interface PriceEntry {
  asset: string;
  usdPrice: string;
}

export interface TaxSummary {
  totalTaxPaisa: number;
  breakdown: {
    vdaGains: number;
    vdaLosses: number;
    incomeFromVda: number;
    slabTax: number;
    flatTax: number;
  };
  computedAt: number;
}

export interface ProofArtifacts {
  proof: string; // base64 encoded
  publicValues: string; // base64 encoded
  verificationKey?: string; // base64 encoded
  generatedAt: number;
}

export interface SessionState {
  version: number;
  userType?: UserType;
  wallets: Wallet[];
  walletGroups: WalletGroup[];
  ledger: LedgerRow[];
  categoryOverrides: CategoryOverride[];
  prices: PriceEntry[];
  usdInrRate: string;
  use44ada: boolean;
  taxSummary?: TaxSummary;
  proofArtifacts?: ProofArtifacts;
  createdAt: number;
  updatedAt: number;
}

export const CURRENT_SESSION_VERSION = 1;

export const createEmptySession = (): SessionState => ({
  version: CURRENT_SESSION_VERSION,
  userType: undefined,
  wallets: [],
  walletGroups: [],
  ledger: [],
  categoryOverrides: [],
  prices: [],
  usdInrRate: "83.00",
  use44ada: false,
  taxSummary: undefined,
  proofArtifacts: undefined,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
