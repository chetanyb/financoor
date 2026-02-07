"use client";

import { useState } from "react";
import { useSession } from "@/lib/session";
import { calculateTax, generateProof, type TaxBreakdown, type ApiLedgerRow, type PriceEntry } from "@/lib/api";
import {
  IconCalculator,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconAlertCircle,
  IconInfoCircle,
  IconCurrencyRupee,
  IconShieldCheck,
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

function formatINR(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "₹0.00";

  // Format with Indian numbering system (lakhs, crores)
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return formatter.format(num);
}

interface BreakdownRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  sublabel?: string;
  negative?: boolean;
  rebate?: boolean;
}

function BreakdownRow({ label, value, highlight, sublabel, negative, rebate }: BreakdownRowProps) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2",
      highlight && "bg-neutral-800/30 -mx-3 px-3 rounded-lg"
    )}>
      <div>
        <p className={cn(
          "text-sm",
          highlight ? "text-neutral-200 font-medium" : "text-neutral-400"
        )}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-neutral-500">{sublabel}</p>
        )}
      </div>
      <p className={cn(
        "font-mono text-sm",
        highlight ? "text-neutral-200 font-semibold" : "text-neutral-300",
        negative && "text-red-400",
        rebate && "text-green-400"
      )}>
        {rebate ? `(−${formatINR(value)})` : formatINR(value)}
      </p>
    </div>
  );
}

export function TaxPanel() {
  const { session, setProofArtifacts } = useSession();
  const [breakdown, setBreakdown] = useState<TaxBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [proofLoading, setProofLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showProofDetails, setShowProofDetails] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!session.userType) {
      setError("Please select a user type first");
      return;
    }

    if (session.ledger.length === 0) {
      setError("No transactions to calculate tax on");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Convert session ledger to API format
      const apiLedger: ApiLedgerRow[] = session.ledger.map((row) => {
        // Apply overrides
        const override = session.categoryOverrides.find((o) => o.ledgerRowId === row.id);
        const category = override?.category ?? row.category;

        return {
          chain_id: row.chainId,
          owner_wallet: row.ownerWallet,
          tx_hash: row.txHash,
          block_time: row.blockTime,
          asset: row.asset,
          amount: row.amount,
          decimals: row.decimals,
          direction: row.direction,
          counterparty: row.counterparty ?? null,
          category,
          confidence: row.confidence,
          user_override: override !== undefined,
        };
      });

      // Convert prices to API format
      const apiPrices: PriceEntry[] = session.prices.map((p) => ({
        asset: p.asset,
        usd_price: p.usdPrice,
      }));

      const response = await calculateTax({
        user_type: session.userType,
        ledger: apiLedger,
        prices: apiPrices,
        usd_inr_rate: session.usdInrRate,
        use_44ada: session.use44ada,
      });

      setBreakdown(response.breakdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate tax");
    } finally {
      setLoading(false);
    }
  };

  const buildApiRequest = () => {
    // Convert session ledger to API format
    const apiLedger: ApiLedgerRow[] = session.ledger.map((row) => {
      const override = session.categoryOverrides.find((o) => o.ledgerRowId === row.id);
      const category = override?.category ?? row.category;
      return {
        chain_id: row.chainId,
        owner_wallet: row.ownerWallet,
        tx_hash: row.txHash,
        block_time: row.blockTime,
        asset: row.asset,
        amount: row.amount,
        decimals: row.decimals,
        direction: row.direction,
        counterparty: row.counterparty ?? null,
        category,
        confidence: row.confidence,
        user_override: override !== undefined,
      };
    });

    const apiPrices: PriceEntry[] = session.prices.map((p) => ({
      asset: p.asset,
      usd_price: p.usdPrice,
    }));

    return {
      user_type: session.userType!,
      ledger: apiLedger,
      prices: apiPrices,
      usd_inr_rate: session.usdInrRate,
      use_44ada: session.use44ada,
    };
  };

  const handleGenerateProof = async () => {
    if (!breakdown) {
      setError("Please calculate tax first");
      return;
    }

    setProofLoading(true);
    setError(null);

    try {
      const request = buildApiRequest();
      const response = await generateProof(request);

      setProofArtifacts({
        ledgerCommitment: response.ledger_commitment,
        totalTaxPaisa: response.total_tax_paisa,
        userTypeCode: response.user_type_code,
        used44ada: response.used_44ada,
        proof: response.proof,
        publicValues: response.public_values,
        vkHash: response.vk_hash,
        note: response.note,
        generatedAt: Date.now(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate proof");
    } finally {
      setProofLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const hasUnreviewedTransactions = session.ledger.some(
    (row) => row.category === "unknown" || (row.confidence < 0.7 && !session.categoryOverrides.find((o) => o.ledgerRowId === row.id))
  );

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconCalculator className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-neutral-200">Tax Calculation</h3>
        </div>
        {session.use44ada && session.userType === "individual" && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-600/50">
            44ADA Presumptive
          </span>
        )}
      </div>

      {/* Warning for unreviewed transactions */}
      {hasUnreviewedTransactions && (
        <div className="mb-4 p-3 rounded-lg bg-yellow-950/30 border border-yellow-900/50 flex items-center gap-2">
          <IconAlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="text-xs text-yellow-400/80">
            Some transactions need review. Tax calculation may be inaccurate.
          </p>
        </div>
      )}

      {/* Calculate button */}
      {!breakdown && (
        <button
          onClick={handleCalculate}
          disabled={loading || session.ledger.length === 0}
          className="w-full py-3 rounded-lg font-medium bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <IconLoader2 className="w-4 h-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <IconCalculator className="w-4 h-4" />
              Calculate Tax
            </>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-950/50 border border-red-800/50 flex items-center gap-2 text-red-400 text-sm">
          <IconAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {breakdown && (
        <div className="space-y-4">
          {/* Total tax - prominent display */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-950/50 to-neutral-900 border border-purple-800/50">
            <p className="text-sm text-neutral-400 mb-1">Total Tax Payable</p>
            <div className="flex items-center gap-2">
              <IconCurrencyRupee className="w-8 h-8 text-purple-400" />
              <p className="text-3xl font-bold text-white">
                {formatINR(breakdown.total_tax_inr).replace("₹", "")}
              </p>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              For FY 2025-26 (AY 2026-27) under new tax regime
            </p>
          </div>

          {/* Expandable breakdown */}
          <div className="border border-neutral-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full p-3 flex items-center justify-between text-sm text-neutral-300 hover:bg-neutral-800/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <IconInfoCircle className="w-4 h-4" />
                How we calculated this
              </span>
              {showDetails ? (
                <IconChevronUp className="w-4 h-4" />
              ) : (
                <IconChevronDown className="w-4 h-4" />
              )}
            </button>

            {showDetails && (
              <div className="p-4 border-t border-neutral-700 space-y-1">
                {/* Income section */}
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Professional Income</p>
                  <BreakdownRow
                    label="Gross Professional Income"
                    value={breakdown.professional_income_inr}
                  />
                  {session.use44ada && session.userType === "individual" && (
                    <BreakdownRow
                      label="After 44ADA (50%)"
                      value={breakdown.taxable_professional_income_inr}
                      sublabel="Presumptive taxation applied"
                    />
                  )}
                  <BreakdownRow
                    label="Income Tax (Slab)"
                    value={breakdown.professional_tax_inr}
                    highlight
                  />
                  {parseFloat(breakdown.section_87a_rebate_inr) > 0 && (
                    <BreakdownRow
                      label="Section 87A Rebate"
                      value={breakdown.section_87a_rebate_inr}
                      rebate
                      sublabel="For income ≤ ₹12L under new regime"
                    />
                  )}
                </div>

                <div className="border-t border-neutral-700/50 my-3" />

                {/* VDA section */}
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Virtual Digital Assets (115BBH)</p>
                  <BreakdownRow
                    label="VDA Gains"
                    value={breakdown.vda_gains_inr}
                  />
                  <BreakdownRow
                    label="VDA Losses (not offset)"
                    value={breakdown.vda_losses_inr}
                    negative
                    sublabel="Losses cannot be set off per Section 115BBH"
                  />
                  <BreakdownRow
                    label="VDA Tax (30%)"
                    value={breakdown.vda_tax_inr}
                    highlight
                  />
                </div>

                <div className="border-t border-neutral-700/50 my-3" />

                {/* Cess and total */}
                <div>
                  <BreakdownRow
                    label="Health & Education Cess (4%)"
                    value={breakdown.cess_inr}
                  />
                  <div className="border-t border-neutral-600 my-2" />
                  <BreakdownRow
                    label="Total Tax Payable"
                    value={breakdown.total_tax_inr}
                    highlight
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="flex-1 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-600 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <IconLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <IconCalculator className="w-4 h-4" />
              )}
              Recalculate
            </button>

            {!session.proofArtifacts && (
              <button
                onClick={handleGenerateProof}
                disabled={proofLoading}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white transition-colors flex items-center justify-center gap-2"
              >
                {proofLoading ? (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IconShieldCheck className="w-4 h-4" />
                    Generate ZK Proof
                  </>
                )}
              </button>
            )}
          </div>

          {/* Proof artifacts */}
          {session.proofArtifacts && (
            <div className="border border-emerald-800/50 rounded-lg overflow-hidden bg-emerald-950/20">
              <button
                onClick={() => setShowProofDetails(!showProofDetails)}
                className="w-full p-3 flex items-center justify-between text-sm text-emerald-300 hover:bg-emerald-900/20 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <IconShieldCheck className="w-4 h-4" />
                  ZK Proof Generated
                </span>
                {showProofDetails ? (
                  <IconChevronUp className="w-4 h-4" />
                ) : (
                  <IconChevronDown className="w-4 h-4" />
                )}
              </button>

              {showProofDetails && (
                <div className="p-4 border-t border-emerald-800/50 space-y-3">
                  {/* Ledger Commitment */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Ledger Commitment (SHA256)</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-neutral-300 bg-neutral-800/50 px-2 py-1 rounded font-mono truncate flex-1">
                        0x{session.proofArtifacts.ledgerCommitment.slice(0, 16)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(session.proofArtifacts!.ledgerCommitment, "commitment")}
                        className="p-1 hover:bg-neutral-700 rounded transition-colors"
                      >
                        {copied === "commitment" ? (
                          <IconCheck className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <IconCopy className="w-3 h-3 text-neutral-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* VK Hash */}
                  <div>
                    <p className="text-xs text-neutral-500 mb-1">Verification Key Hash</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-neutral-300 bg-neutral-800/50 px-2 py-1 rounded font-mono truncate flex-1">
                        {session.proofArtifacts.vkHash.slice(0, 22)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(session.proofArtifacts!.vkHash, "vkHash")}
                        className="p-1 hover:bg-neutral-700 rounded transition-colors"
                      >
                        {copied === "vkHash" ? (
                          <IconCheck className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <IconCopy className="w-3 h-3 text-neutral-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tax Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Tax (paisa)</p>
                      <p className="text-sm font-mono text-neutral-300">
                        {session.proofArtifacts.totalTaxPaisa.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">User Type</p>
                      <p className="text-sm text-neutral-300">
                        {["Individual", "HUF", "Corporate"][session.proofArtifacts.userTypeCode]}
                      </p>
                    </div>
                  </div>

                  {/* Note */}
                  <div className="p-2 rounded bg-amber-950/30 border border-amber-800/30">
                    <p className="text-xs text-amber-400/80">
                      {session.proofArtifacts.note}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(session.proofArtifacts!.proof, "proof")}
                      className="flex-1 py-2 rounded text-xs text-neutral-400 hover:text-white border border-neutral-700 hover:border-neutral-600 transition-colors flex items-center justify-center gap-2"
                    >
                      {copied === "proof" ? (
                        <>
                          <IconCheck className="w-3 h-3 text-emerald-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <IconCopy className="w-3 h-3" />
                          Copy Proof
                        </>
                      )}
                    </button>
                    <Link
                      href="/verify"
                      className="flex-1 py-2 rounded text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2"
                    >
                      <IconShieldCheck className="w-3 h-3" />
                      Verify On-Chain
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/50">
            <p className="text-xs text-neutral-500">
              <strong className="text-neutral-400">Disclaimer:</strong> This is a demo calculation for hackathon purposes only.
              Not legal or financial advice. Consult a qualified tax professional for actual tax filing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
