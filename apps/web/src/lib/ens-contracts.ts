import { keccak256, toBytes, type Hex } from "viem";

// ENS Contracts on Sepolia
export const ENS_CONTRACTS = {
  registry: "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const,
  resolver: "0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5" as const,
  nameWrapper: "0x0635513f179D50A207757E05759CbD106d7dFcE8" as const,
};

// ENS Registry ABI (for ownership checks)
export const ensRegistryAbi = [
  {
    name: "owner",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "resolver",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

// NameWrapper ABI (for subdomain creation - modern approach)
export const nameWrapperAbi = [
  {
    name: "setSubnodeRecord",
    type: "function",
    inputs: [
      { name: "parentNode", type: "bytes32" },
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
      { name: "fuses", type: "uint32" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    name: "getData",
    type: "function",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "fuses", type: "uint32" },
      { name: "expiry", type: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    name: "ownerOf",
    type: "function",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "isWrapped",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

// Public Resolver ABI (for setting address records)
export const resolverAbi = [
  {
    name: "setAddr",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "addr",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

/**
 * Compute the namehash of an ENS name
 * @param name - The ENS name (e.g., "alice.family.eth")
 * @returns The namehash as a hex string
 */
export function namehash(name: string): Hex {
  if (!name || name === "") {
    return ("0x" + "0".repeat(64)) as Hex;
  }

  const labels = name.toLowerCase().split(".").reverse();
  let node: Uint8Array = new Uint8Array(32); // Start with 0x00...00

  for (const label of labels) {
    if (label) {
      const labelHash = keccak256(toBytes(label));
      // Convert labelHash to Uint8Array and compute next node
      const labelBytes = hexToBytes(labelHash);
      const combined = new Uint8Array(64);
      combined.set(node, 0);
      combined.set(labelBytes, 32);
      node = hexToBytes(keccak256(combined));
    }
  }

  return bytesToHex(node);
}

/**
 * Compute the labelhash (keccak256 of the label)
 * @param label - The label (e.g., "alice")
 * @returns The labelhash as a hex string
 */
export function labelhash(label: string): Hex {
  return keccak256(toBytes(label.toLowerCase()));
}

// Helper functions
function hexToBytes(hex: Hex): Uint8Array {
  const bytes = new Uint8Array((hex.length - 2) / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): Hex {
  return ("0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")) as Hex;
}

/**
 * Convert a namehash to a uint256 for NameWrapper functions
 */
export function namehashToTokenId(node: Hex): bigint {
  return BigInt(node);
}

// Contract config objects for wagmi
export const ensRegistryConfig = {
  address: ENS_CONTRACTS.registry,
  abi: ensRegistryAbi,
} as const;

export const nameWrapperConfig = {
  address: ENS_CONTRACTS.nameWrapper,
  abi: nameWrapperAbi,
} as const;

export const resolverConfig = {
  address: ENS_CONTRACTS.resolver,
  abi: resolverAbi,
} as const;
