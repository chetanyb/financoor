import { CONTRACTS } from "./wagmi";

// DemoToken ABI (ERC20 + faucet)
export const demoTokenAbi = [
  {
    type: "function",
    name: "faucet",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "symbol",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "FAUCET_AMOUNT",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// ProfitMachine ABI
export const profitMachineAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "MULTIPLIER",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// LossMachine ABI
export const lossMachineAbi = [
  {
    type: "function",
    name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "MULTIPLIER",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// YieldFarm ABI
export const yieldFarmAbi = [
  {
    type: "function",
    name: "stake",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unstake",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimRewards",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "stakes",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "startBlock", type: "uint256" },
      { name: "claimedRewards", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingRewards",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "REWARD_RATE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// TaxVerifier ABI
export const taxVerifierAbi = [
  {
    type: "function",
    name: "verifyTaxProof",
    inputs: [
      { name: "proofBytes", type: "bytes" },
      { name: "publicValues", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "isVerified",
    inputs: [{ name: "ledgerCommitment", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getTaxRecord",
    inputs: [{ name: "ledgerCommitment", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "totalTaxPaisa", type: "uint256" },
          { name: "userType", type: "uint8" },
          { name: "used44ada", type: "bool" },
          { name: "verifiedAt", type: "uint256" },
          { name: "verifiedBy", type: "address" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "taxZkVkey",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "TaxProofVerified",
    inputs: [
      { name: "ledgerCommitment", type: "bytes32", indexed: true },
      { name: "totalTaxPaisa", type: "uint256", indexed: false },
      { name: "userType", type: "uint8", indexed: false },
      { name: "used44ada", type: "bool", indexed: false },
      { name: "verifiedBy", type: "address", indexed: true },
    ],
  },
] as const;

// Contract config objects for wagmi
export const demoTokenConfig = {
  address: CONTRACTS.demoToken,
  abi: demoTokenAbi,
} as const;

export const profitMachineConfig = {
  address: CONTRACTS.profitMachine,
  abi: profitMachineAbi,
} as const;

export const lossMachineConfig = {
  address: CONTRACTS.lossMachine,
  abi: lossMachineAbi,
} as const;

export const yieldFarmConfig = {
  address: CONTRACTS.yieldFarm,
  abi: yieldFarmAbi,
} as const;

export const taxVerifierConfig = {
  address: CONTRACTS.taxVerifier,
  abi: taxVerifierAbi,
} as const;
