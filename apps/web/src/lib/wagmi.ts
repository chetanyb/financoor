import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Financoor",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [sepolia],
  ssr: true,
});

// Contract addresses on Sepolia
export const CONTRACTS = {
  demoToken: "0x5815605f56c90E2b6467f489BD3b6E18BBa1AFF1" as const,
  profitMachine: "0xB99Db0d6A22eEB129E5AEbb4C94e46Cb1640f465" as const,
  lossMachine: "0x754F565155B363F94657Ac7E106e361297CD6ebE" as const,
  yieldFarm: "0xfD3e2E9DB59B9611FA14560C79316f6ce6714F9B" as const,
  taxVerifier: "0x5009Bc72A4630A8f34E1EB63bc59Eedd7a2000C7" as const,
  sp1Verifier: "0x397A5f7f3dBd538f23DE225B51f532c34448dA9B" as const,
} as const;
