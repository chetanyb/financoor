"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconApps,
  IconTestPipe,
  IconExternalLink,
} from "@tabler/icons-react";
import Link from "next/link";

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

export default function DemoPage() {
  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative">
      {/* Floating dock navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Demo Setup</h1>
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-xl font-semibold text-neutral-200 mb-6">
            Generate Demo Activity on Sepolia
          </h2>

          <p className="text-neutral-400 mb-8">
            To test Financoor, you can generate deterministic on-chain activity using our demo contracts.
            This creates real transactions that our indexer can fetch.
          </p>

          {/* Demo contracts info - placeholder for Chunk 4 */}
          <div className="space-y-6">
            <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <h3 className="text-neutral-200 font-medium mb-2">Demo Contracts (Sepolia)</h3>
              <p className="text-neutral-500 text-sm mb-4">
                Contracts will be deployed in Chunk 4
              </p>
              <div className="space-y-2 text-sm font-mono">
                <div className="flex justify-between text-neutral-400">
                  <span>DEMODOLLAH (ERC-20):</span>
                  <span className="text-neutral-500">TBD</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>ProfitMachine:</span>
                  <span className="text-neutral-500">TBD</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>LossMachine:</span>
                  <span className="text-neutral-500">TBD</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>YieldFarm:</span>
                  <span className="text-neutral-500">TBD</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <h3 className="text-neutral-200 font-medium mb-2">Demo Flow</h3>
              <ol className="list-decimal list-inside space-y-2 text-neutral-400 text-sm">
                <li>Get Sepolia ETH from a faucet</li>
                <li>Mint DEMODOLLAH tokens from faucet contract</li>
                <li>Deposit into ProfitMachine (receive 2x back = gains)</li>
                <li>Deposit into LossMachine (receive 0.5x back = losses)</li>
                <li>Stake in YieldFarm and claim rewards</li>
                <li>Transfer between your wallets (internal transfers)</li>
              </ol>
            </div>

            <div className="p-4 rounded-lg bg-blue-950/30 border border-blue-900/50">
              <h3 className="text-blue-300 font-medium mb-2">Quick Links</h3>
              <div className="space-y-2">
                <a
                  href="https://sepoliafaucet.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <IconExternalLink className="w-4 h-4" />
                  Sepolia Faucet
                </a>
                <a
                  href="https://sepolia.etherscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <IconExternalLink className="w-4 h-4" />
                  Sepolia Etherscan
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-neutral-500 text-sm">
              Demo contracts and scripts coming in Chunk 4
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
