"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconApps,
  IconTestPipe,
  IconExternalLink,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

const dockItems = [
  {
    title: "Home",
    icon: <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/",
  },
  {
    title: "App",
    icon: <IconApps className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/app",
  },
  {
    title: "Demo",
    icon: <IconTestPipe className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/demo",
  },
];

// Demo contract addresses on Sepolia (to be updated after deployment)
const CONTRACTS = {
  demoToken: "0x...", // DEMODOLLAH
  profitMachine: "0x...",
  lossMachine: "0x...",
  yieldFarm: "0x...",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (text === "0x...") return null;

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
    >
      {copied ? (
        <IconCheck className="w-4 h-4 text-green-400" />
      ) : (
        <IconCopy className="w-4 h-4" />
      )}
    </button>
  );
}

export default function DemoPage() {
  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative">
      {/* Floating dock navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-16 pb-32">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Demo Setup</h1>
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <div className="space-y-6">
          {/* Intro */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h2 className="text-xl font-semibold text-neutral-200 mb-4">
              Generate Demo Activity on Sepolia
            </h2>
            <p className="text-neutral-400 text-sm">
              To test Financoor, you can generate deterministic on-chain activity using our demo contracts.
              This creates real transactions that our indexer can fetch, categorize, and calculate taxes on.
            </p>
          </div>

          {/* Demo contracts */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Demo Contracts (Sepolia)</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                <div>
                  <p className="text-neutral-200 font-medium">DEMODOLLAH (ERC-20)</p>
                  <p className="text-neutral-500 text-xs">Faucet token - mint 10,000 DEMO for free</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-neutral-400 font-mono">{CONTRACTS.demoToken}</code>
                  <CopyButton text={CONTRACTS.demoToken} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-950/30 border border-green-900/50">
                <div>
                  <p className="text-neutral-200 font-medium">ProfitMachine</p>
                  <p className="text-green-400/70 text-xs">Deposit DEMO → receive 2x back (gains)</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-neutral-400 font-mono">{CONTRACTS.profitMachine}</code>
                  <CopyButton text={CONTRACTS.profitMachine} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-red-950/30 border border-red-900/50">
                <div>
                  <p className="text-neutral-200 font-medium">LossMachine</p>
                  <p className="text-red-400/70 text-xs">Deposit DEMO → receive 0.5x back (losses)</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-neutral-400 font-mono">{CONTRACTS.lossMachine}</code>
                  <CopyButton text={CONTRACTS.lossMachine} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-950/30 border border-blue-900/50">
                <div>
                  <p className="text-neutral-200 font-medium">YieldFarm</p>
                  <p className="text-blue-400/70 text-xs">Stake DEMO → earn 10% rewards per block</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-neutral-400 font-mono">{CONTRACTS.yieldFarm}</code>
                  <CopyButton text={CONTRACTS.yieldFarm} />
                </div>
              </div>
            </div>
          </div>

          {/* Demo flow */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4">Demo Flow</h3>

            <ol className="space-y-4">
              <li className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="text-neutral-200 font-medium">Get Sepolia ETH</p>
                  <p className="text-neutral-500 text-sm">Use a faucet to get testnet ETH for gas fees</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="text-neutral-200 font-medium">Mint DEMODOLLAH</p>
                  <p className="text-neutral-500 text-sm">Call <code className="text-xs bg-neutral-800 px-1 rounded">faucet()</code> on DemoToken to get 10,000 DEMO</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="text-neutral-200 font-medium">Generate Gains</p>
                  <p className="text-neutral-500 text-sm">Approve & deposit into ProfitMachine → receive 2x back</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                  4
                </div>
                <div>
                  <p className="text-neutral-200 font-medium">Generate Losses</p>
                  <p className="text-neutral-500 text-sm">Approve & deposit into LossMachine → receive 0.5x back</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                  5
                </div>
                <div>
                  <p className="text-neutral-200 font-medium">Earn Yield</p>
                  <p className="text-neutral-500 text-sm">Stake in YieldFarm, wait a few blocks, then claim rewards</p>
                </div>
              </li>

              <li className="flex gap-4">
                <div className="w-7 h-7 rounded-full bg-neutral-500/20 text-neutral-400 flex items-center justify-center font-mono text-sm flex-shrink-0">
                  6
                </div>
                <div>
                  <p className="text-neutral-200 font-medium">Internal Transfers</p>
                  <p className="text-neutral-500 text-sm">Transfer between your wallets (will be categorized as internal)</p>
                </div>
              </li>
            </ol>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-blue-900/50 bg-blue-950/20 p-6">
            <h3 className="text-lg font-semibold text-blue-300 mb-4">Quick Links</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-sm text-blue-400 hover:text-blue-300 hover:border-neutral-600 transition-colors"
              >
                <IconExternalLink className="w-4 h-4" />
                Google Cloud Sepolia Faucet
              </a>
              <a
                href="https://sepolia.etherscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 text-sm text-blue-400 hover:text-blue-300 hover:border-neutral-600 transition-colors"
              >
                <IconExternalLink className="w-4 h-4" />
                Sepolia Etherscan
              </a>
            </div>
          </div>

          {/* Note */}
          <div className="text-center text-neutral-500 text-sm">
            <p>Contract addresses will be updated after deployment to Sepolia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
