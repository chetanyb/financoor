"use client";

import { useState, useEffect } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { SessionManager } from "@/components/session-manager";
import { Wizard } from "@/components/wizard";
import { useSession } from "@/lib/session";
import {
  IconHome,
  IconApps,
  IconTestPipe,
  IconCheck,
  IconRefresh,
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

function SetupComplete() {
  const { session, resetSession } = useSession();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const userTypeLabels = {
    individual: "Individual",
    huf: "HUF",
    corporate: "Corporate",
  };

  return (
    <div className="rounded-2xl border border-green-900/50 bg-green-950/20 p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <IconCheck className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-neutral-200">Setup Complete</h2>
          <p className="text-sm text-neutral-500">Your session is ready for analysis</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Entity Type</p>
          <p className="text-neutral-200 font-medium">
            {session.userType ? userTypeLabels[session.userType] : "Not set"}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
          <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Wallets</p>
          <p className="text-neutral-200 font-medium">
            {session.wallets.length} wallet{session.wallets.length !== 1 ? "s" : ""}
            {session.walletGroups.length > 0 && (
              <span className="text-neutral-500">
                {" "}in {session.walletGroups.length} group{session.walletGroups.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-medium text-neutral-400">Next Steps</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/50">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-mono">
              1
            </div>
            <span className="text-sm text-neutral-300">Sync transactions (Coming in Chunk 3)</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/50">
            <div className="w-6 h-6 rounded-full bg-neutral-700/50 text-neutral-500 flex items-center justify-center text-xs font-mono">
              2
            </div>
            <span className="text-sm text-neutral-500">Review & categorize transactions</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/50">
            <div className="w-6 h-6 rounded-full bg-neutral-700/50 text-neutral-500 flex items-center justify-center text-xs font-mono">
              3
            </div>
            <span className="text-sm text-neutral-500">Calculate tax & generate proof</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
        {showResetConfirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-400">Start over?</span>
            <button
              onClick={() => {
                resetSession();
                setShowResetConfirm(false);
              }}
              className="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 bg-red-950/50 hover:bg-red-950 border border-red-800 rounded-lg transition-colors"
            >
              Yes, reset
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            <IconRefresh className="w-4 h-4" />
            Start Over
          </button>
        )}
        <button
          disabled
          className="px-6 py-2 rounded-full font-medium bg-neutral-700 text-neutral-500 cursor-not-allowed"
        >
          Sync Transactions (Soon)
        </button>
      </div>
    </div>
  );
}

export default function AppPage() {
  const { session, isLoaded } = useSession();
  const [wizardComplete, setWizardComplete] = useState(false);

  // On initial load, check if session already has completed setup
  useEffect(() => {
    if (isLoaded && session.userType && session.wallets.length > 0) {
      setWizardComplete(true);
    }
  }, [isLoaded]); // Only run once when loaded, ignore session changes

  // Show wizard only if not explicitly completed
  const showWizard = !wizardComplete;

  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative">
      {/* Floating dock navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-16 pb-32">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-white">Financoor App</h1>
          <Link
            href="/"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>

        {/* Session manager */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-xs text-neutral-500">
            {isLoaded && (
              <>
                {session.wallets.length} wallet{session.wallets.length !== 1 ? "s" : ""} ·{" "}
                {session.ledger.length} transaction{session.ledger.length !== 1 ? "s" : ""}
              </>
            )}
          </div>
          <SessionManager />
        </div>

        {/* Content */}
        {!isLoaded ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
            <p className="text-neutral-500">Loading session...</p>
          </div>
        ) : showWizard ? (
          <Wizard onComplete={() => setWizardComplete(true)} />
        ) : (
          <SetupComplete />
        )}
      </div>
    </div>
  );
}
