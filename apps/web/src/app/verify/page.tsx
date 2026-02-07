"use client";

import { useState } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { useSession } from "@/lib/session";
import {
  IconHome,
  IconApps,
  IconTestPipe,
  IconShieldCheck,
  IconAlertCircle,
  IconLoader2,
  IconExternalLink,
  IconCopy,
  IconCheck,
  IconUpload,
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

// Mock TaxVerifier address on Sepolia (would be set after deployment)
const TAX_VERIFIER_ADDRESS = "0x0000000000000000000000000000000000000000";

interface VerificationState {
  status: "idle" | "verifying" | "success" | "error";
  txHash?: string;
  error?: string;
}

function formatTaxFromPaisa(paisa: number): string {
  const inr = paisa / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(inr);
}

export default function VerifyPage() {
  const { session, isLoaded } = useSession();
  const [verification, setVerification] = useState<VerificationState>({ status: "idle" });
  const [copied, setCopied] = useState<string | null>(null);
  const [manualProof, setManualProof] = useState("");
  const [manualPublicValues, setManualPublicValues] = useState("");
  const [useManualInput, setUseManualInput] = useState(false);

  const proofArtifacts = session.proofArtifacts;

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerify = async () => {
    setVerification({ status: "verifying" });

    try {
      // In a real implementation, this would:
      // 1. Connect to wallet (via wagmi/viem)
      // 2. Call TaxVerifier.verifyTaxProof(proofBytes, publicValues)
      // 3. Wait for transaction confirmation

      // For demo, simulate the verification process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock successful verification
      setVerification({
        status: "success",
        txHash: "0x" + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(""),
      });
    } catch (err) {
      setVerification({
        status: "error",
        error: err instanceof Error ? err.message : "Verification failed",
      });
    }
  };

  const userTypeLabel = ["Individual", "HUF", "Corporate"];

  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative">
      {/* Floating dock navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-16 pb-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Verify Proof</h1>
            <p className="text-neutral-500 mt-1">Submit ZK proof for on-chain verification</p>
          </div>
          <Link
            href="/app"
            className="text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Back to App
          </Link>
        </div>

        {!isLoaded ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
            <p className="text-neutral-500">Loading...</p>
          </div>
        ) : proofArtifacts && !useManualInput ? (
          <div className="space-y-6">
            {/* Proof summary */}
            <div className="rounded-2xl border border-emerald-800/50 bg-emerald-950/20 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <IconShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-200">Proof Ready</h2>
                  <p className="text-sm text-neutral-500">
                    Generated {new Date(proofArtifacts.generatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Total Tax</p>
                  <p className="text-lg font-semibold text-white">
                    {formatTaxFromPaisa(proofArtifacts.totalTaxPaisa)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Entity Type</p>
                  <p className="text-lg font-semibold text-white">
                    {userTypeLabel[proofArtifacts.userTypeCode]}
                  </p>
                </div>
              </div>

              {/* Ledger commitment */}
              <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Ledger Commitment</p>
                  <button
                    onClick={() => copyToClipboard(proofArtifacts.ledgerCommitment, "commitment")}
                    className="p-1 hover:bg-neutral-700 rounded transition-colors"
                  >
                    {copied === "commitment" ? (
                      <IconCheck className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <IconCopy className="w-3 h-3 text-neutral-400" />
                    )}
                  </button>
                </div>
                <code className="text-xs text-neutral-300 font-mono break-all">
                  0x{proofArtifacts.ledgerCommitment}
                </code>
              </div>

              {/* VK Hash */}
              <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-neutral-500 uppercase tracking-wide">Verification Key Hash</p>
                  <button
                    onClick={() => copyToClipboard(proofArtifacts.vkHash, "vkHash")}
                    className="p-1 hover:bg-neutral-700 rounded transition-colors"
                  >
                    {copied === "vkHash" ? (
                      <IconCheck className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <IconCopy className="w-3 h-3 text-neutral-400" />
                    )}
                  </button>
                </div>
                <code className="text-xs text-neutral-300 font-mono break-all">
                  {proofArtifacts.vkHash}
                </code>
              </div>

              {/* 44ADA indicator */}
              {proofArtifacts.used44ada && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-600/50">
                    Section 44ADA Applied
                  </span>
                </div>
              )}

              {/* Demo note */}
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/30 mb-4">
                <p className="text-xs text-amber-400/80">
                  {proofArtifacts.note}
                </p>
              </div>

              <button
                onClick={() => setUseManualInput(true)}
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Or upload different proof
              </button>
            </div>

            {/* Verification action */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
              <h3 className="text-lg font-semibold text-neutral-200 mb-4">Submit to Blockchain</h3>

              <div className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-700 mb-4">
                <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">TaxVerifier Contract</p>
                <code className="text-xs text-neutral-300 font-mono">
                  {TAX_VERIFIER_ADDRESS === "0x0000000000000000000000000000000000000000"
                    ? "Not deployed yet (demo mode)"
                    : TAX_VERIFIER_ADDRESS}
                </code>
              </div>

              {verification.status === "idle" && (
                <button
                  onClick={handleVerify}
                  className="w-full py-3 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
                >
                  <IconShieldCheck className="w-5 h-5" />
                  Verify Proof On-Chain (Demo)
                </button>
              )}

              {verification.status === "verifying" && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <IconLoader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span className="text-neutral-300">Submitting verification transaction...</span>
                </div>
              )}

              {verification.status === "success" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <IconCheck className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Verification Successful!</span>
                    </div>
                    <p className="text-sm text-neutral-400 mb-3">
                      Your tax proof has been verified and recorded on-chain.
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-neutral-300 font-mono flex-1 truncate">
                        {verification.txHash}
                      </code>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${verification.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-neutral-700 rounded transition-colors"
                      >
                        <IconExternalLink className="w-4 h-4 text-neutral-400" />
                      </a>
                    </div>
                  </div>

                  <button
                    onClick={() => setVerification({ status: "idle" })}
                    className="w-full py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-600 transition-colors"
                  >
                    Verify Again
                  </button>
                </div>
              )}

              {verification.status === "error" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-red-950/50 border border-red-800/50">
                    <div className="flex items-center gap-2 mb-2">
                      <IconAlertCircle className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-medium">Verification Failed</span>
                    </div>
                    <p className="text-sm text-red-400/80">{verification.error}</p>
                  </div>

                  <button
                    onClick={() => setVerification({ status: "idle" })}
                    className="w-full py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-600 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* No proof available - manual upload */}
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-neutral-700/50 flex items-center justify-center">
                  <IconUpload className="w-5 h-5 text-neutral-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-neutral-200">Upload Proof</h2>
                  <p className="text-sm text-neutral-500">
                    Paste your proof artifacts to verify
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Proof (Base64)
                  </label>
                  <textarea
                    value={manualProof}
                    onChange={(e) => setManualProof(e.target.value)}
                    placeholder="Paste proof bytes here..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-2">
                    Public Values (Base64)
                  </label>
                  <textarea
                    value={manualPublicValues}
                    onChange={(e) => setManualPublicValues(e.target.value)}
                    placeholder="Paste public values here..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-200 text-sm font-mono placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600"
                  />
                </div>

                <button
                  onClick={handleVerify}
                  disabled={!manualProof || !manualPublicValues}
                  className="w-full py-3 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
                >
                  <IconShieldCheck className="w-5 h-5" />
                  Verify Proof
                </button>

                {proofArtifacts && (
                  <button
                    onClick={() => setUseManualInput(false)}
                    className="w-full py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                  >
                    Use proof from session
                  </button>
                )}
              </div>
            </div>

            {!proofArtifacts && (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 text-center">
                <p className="text-neutral-500 mb-4">
                  No proof in your current session. Generate one first in the app.
                </p>
                <Link
                  href="/app"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                >
                  Go to App
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Info section */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-lg font-semibold text-neutral-200 mb-4">How Verification Works</h3>
          <div className="space-y-3 text-sm text-neutral-400">
            <p>
              <strong className="text-neutral-300">1. Proof Generation:</strong> Your transaction ledger
              and tax calculation are processed by the SP1 zkVM to generate a cryptographic proof.
            </p>
            <p>
              <strong className="text-neutral-300">2. On-Chain Submission:</strong> The proof and public
              values are submitted to the TaxVerifier smart contract on Sepolia.
            </p>
            <p>
              <strong className="text-neutral-300">3. Verification:</strong> The contract verifies the
              proof using SP1&apos;s on-chain verifier, confirming your tax calculation is correct.
            </p>
            <p>
              <strong className="text-neutral-300">4. Record:</strong> Once verified, your ledger commitment
              and tax amount are permanently recorded on-chain, providing an auditable trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
