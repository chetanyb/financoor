# Financoor Demo Guide

This guide walks through the complete demo flow for HackMoney 2026.

## Prerequisites

1. **Sepolia ETH** - Get from a faucet like [sepoliafaucet.com](https://sepoliafaucet.com)
2. **Alchemy API Key** - Sign up at [alchemy.com](https://alchemy.com) for Sepolia API access
3. **Test Wallet** - Any wallet with Sepolia transactions

## Quick Start

```bash
# 1. Start the API server
cd crates/api
ALCHEMY_API_KEY=your_key cargo run

# 2. Start the web app (in another terminal)
cd apps/web
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Demo Flow

### Step 1: Wallet Setup

1. Click **"Enter App"** from the landing page
2. Select entity type: **Individual** (to showcase 44ADA toggle)
3. Add wallets:
   - **Option A**: Paste a Sepolia address directly
   - **Option B**: Switch to "ENS Root" tab and enter a parent name (e.g., `vitalik.eth`) to discover subdomains

### Step 2: Sync Transactions

1. Click **"Sync Transactions"** button
2. Wait for Alchemy to fetch transfers from Sepolia
3. View the transaction ledger with auto-categorized entries

### Step 3: Review Categories

1. Use category tabs to filter: All, Needs Review, Income, Gains, etc.
2. Click category dropdown on any row to override the auto-detected category
3. Low-confidence items are highlighted with yellow badges

### Step 4: Set Prices

1. The pricing panel auto-populates unique assets from your ledger
2. Enter USD prices for each asset (defaults provided)
3. Set the USD/INR exchange rate (default: 83.00)

### Step 5: Calculate Tax

1. (Optional) Toggle **Section 44ADA** for presumptive taxation on professional income
2. Click **"Calculate Tax"** button
3. View the tax breakdown:
   - Professional income under new regime slabs
   - VDA gains at 30% flat rate
   - Health & Education Cess at 4%

### Step 6: Generate ZK Proof

1. Click **"Generate ZK Proof"** button
2. View proof artifacts:
   - Ledger commitment (SHA256 hash)
   - Verification key hash
   - Total tax in paisa
   - Base64-encoded proof data

### Step 7: Verify On-Chain

1. Click **"Verify On-Chain"** or navigate to `/verify`
2. Review proof summary
3. Click **"Verify Proof On-Chain (Demo)"** to simulate verification
4. View the mock transaction hash

---

## Demo Contracts (Sepolia)

If you need to generate test activity:

```bash
cd contracts

# Deploy demo contracts (DemoToken, ProfitMachine, LossMachine, YieldFarm)
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast

# Interact with contracts to generate transactions
# - ProfitMachine: deposit tokens, withdraw with 10% bonus
# - LossMachine: deposit tokens, withdraw with 10% loss
# - YieldFarm: stake tokens, claim simulated yield
```

---

## Key Features to Highlight

1. **Privacy-Preserving Tax Verification**
   - Calculate taxes on your full transaction history
   - Generate ZK proof that verifies calculation correctness
   - Submit proof on-chain without revealing transaction details

2. **Indian Tax Compliance**
   - Section 115BBH: VDA taxed at 30% flat rate
   - Section 115BAC: New regime slab rates for FY 2025-26
   - Section 44ADA: 50% presumptive deduction for professionals

3. **ENS Integration**
   - Resolve root ENS names to discover family/entity subdomains
   - Auto-import all resolved addresses as wallets

4. **Alchemy Integration**
   - Fetch complete transfer history from Sepolia
   - Support for ETH, ERC-20, ERC-721, ERC-1155 transfers

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│    Axum API     │────▶│   SP1 Prover    │
│   (apps/web)    │     │   (crates/api)  │     │ (crates/prover) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  localStorage   │     │  Alchemy API    │     │  tax-zk guest   │
│  (session)      │     │  ENS Subgraph   │     │ (programs/tax)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │  TaxVerifier    │
                                                │  (Sepolia)      │
                                                └─────────────────┘
```

---

## Troubleshooting

**API not connecting**
- Ensure API is running on port 3001
- Check CORS settings allow localhost:3000

**No transactions fetched**
- Verify wallet has Sepolia activity (not mainnet)
- Check Alchemy API key is valid

**ENS resolution fails**
- ENS subgraph queries mainnet, not Sepolia
- Only names with resolved addresses are returned

---

## Screenshot Checklist

For hackathon submission:

1. Landing page with privacy comparison
2. Wallet wizard with ENS resolution
3. Transaction ledger with categories
4. Tax calculation breakdown
5. Proof generation success
6. Verify page with proof details

---

Built with SP1 zkVM + Alchemy + ENS for HackMoney 2026
