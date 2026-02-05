"use client";

import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconApps,
  IconTestPipe,
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

export default function AppPage() {
  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative">
      {/* Floating dock navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Financoor App</h1>
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>

        {/* Placeholder for wizard - will be implemented in Chunk 2 */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="text-xl font-semibold text-neutral-200 mb-6">
            Get Started
          </h2>

          <p className="text-neutral-400 mb-8">
            Welcome to Financoor! This wizard will guide you through:
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm">
                1
              </div>
              <div>
                <p className="text-neutral-200 font-medium">Select User Type</p>
                <p className="text-neutral-500 text-sm">Individual, HUF, or Corporate</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm">
                2
              </div>
              <div>
                <p className="text-neutral-200 font-medium">Add Wallets</p>
                <p className="text-neutral-500 text-sm">Enter addresses or ENS names</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm">
                3
              </div>
              <div>
                <p className="text-neutral-200 font-medium">Sync & Review</p>
                <p className="text-neutral-500 text-sm">Fetch transactions and categorize</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-sm">
                4
              </div>
              <div>
                <p className="text-neutral-200 font-medium">Generate Proof</p>
                <p className="text-neutral-500 text-sm">Create ZK proof of your tax calculation</p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-neutral-500 text-sm mb-4">
              Coming in Chunk 2: Full wizard implementation
            </p>
            <button
              disabled
              className="px-6 py-2 rounded-full bg-neutral-700 text-neutral-400 cursor-not-allowed"
            >
              Start (Coming Soon)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
