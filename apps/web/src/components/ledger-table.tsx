"use client";

import { useState } from "react";
import { useSession, type LedgerRow } from "@/lib/session";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconExternalLink,
  IconFilter,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function shortenHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(Math.min(4, decimals));
}

const categoryColors: Record<string, string> = {
  income: "text-green-400 bg-green-950/50 border-green-800/50",
  gains: "text-emerald-400 bg-emerald-950/50 border-emerald-800/50",
  losses: "text-red-400 bg-red-950/50 border-red-800/50",
  fees: "text-orange-400 bg-orange-950/50 border-orange-800/50",
  internal: "text-blue-400 bg-blue-950/50 border-blue-800/50",
  unknown: "text-neutral-400 bg-neutral-800/50 border-neutral-700/50",
};

export function LedgerTable() {
  const { session } = useSession();
  const [filter, setFilter] = useState<string>("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");

  const filteredLedger = session.ledger.filter((row) => {
    if (filter !== "all" && row.category !== filter) return false;
    if (walletFilter !== "all" && row.ownerWallet !== walletFilter) return false;
    return true;
  });

  const categories = ["all", "income", "gains", "losses", "fees", "internal", "unknown"];
  const wallets = ["all", ...new Set(session.ledger.map((r) => r.ownerWallet))];

  if (session.ledger.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-700 p-8 text-center">
        <p className="text-neutral-500">No transactions synced yet.</p>
        <p className="text-neutral-600 text-sm mt-1">
          Click &quot;Sync Transactions&quot; to fetch your on-chain activity.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <IconFilter className="w-4 h-4 text-neutral-500" />
          <span className="text-xs text-neutral-500">Category:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300 focus:outline-none"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {wallets.length > 2 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">Wallet:</span>
            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="text-xs bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-neutral-300 focus:outline-none font-mono"
            >
              {wallets.map((w) => (
                <option key={w} value={w}>
                  {w === "all" ? "All Wallets" : shortenAddress(w)}
                </option>
              ))}
            </select>
          </div>
        )}

        <span className="text-xs text-neutral-500 ml-auto">
          {filteredLedger.length} of {session.ledger.length} transactions
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-800/50 text-neutral-400 text-xs uppercase tracking-wide">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Direction</th>
                <th className="text-left p-3 font-medium">Asset</th>
                <th className="text-right p-3 font-medium">Amount</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Counterparty</th>
                <th className="text-left p-3 font-medium">Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredLedger.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="p-3 text-neutral-300 whitespace-nowrap">
                    {formatDate(row.blockTime)}
                  </td>
                  <td className="p-3">
                    {row.direction === "in" ? (
                      <span className="flex items-center gap-1 text-green-400">
                        <IconArrowDownLeft className="w-4 h-4" />
                        In
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400">
                        <IconArrowUpRight className="w-4 h-4" />
                        Out
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-neutral-200 font-medium">
                    {row.asset}
                  </td>
                  <td className="p-3 text-right font-mono text-neutral-200">
                    {row.direction === "in" ? "+" : "-"}
                    {formatAmount(row.amount, row.decimals)}
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs border",
                        categoryColors[row.category]
                      )}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-xs text-neutral-400">
                    {row.counterparty ? shortenAddress(row.counterparty) : "—"}
                  </td>
                  <td className="p-3">
                    <a
                      href={`https://sepolia.etherscan.io/tx/${row.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      {shortenHash(row.txHash)}
                      <IconExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
