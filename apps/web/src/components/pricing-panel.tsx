"use client";

import { useMemo, useState } from "react";
import { useSession } from "@/lib/session";
import { IconCurrencyDollar, IconCurrencyRupee, IconInfoCircle } from "@tabler/icons-react";

// Default prices for demo assets
const DEFAULT_PRICES: Record<string, string> = {
  ETH: "2500.00",
  DEMO: "1.00",
  DEMODOLLAH: "1.00",
};

const DEFAULT_USD_INR = "83.00";

export function PricingPanel() {
  const { session, setPrices, setUsdInrRate } = useSession();
  const [localUsdInr, setLocalUsdInr] = useState(session.usdInrRate || DEFAULT_USD_INR);

  // Get unique assets from ledger
  const uniqueAssets = useMemo(
    () => [...new Set(session.ledger.map((row) => row.asset))],
    [session.ledger]
  );
  const priceMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const entry of session.prices) {
      map[entry.asset] = entry.usdPrice;
    }
    for (const asset of uniqueAssets) {
      if (!map[asset]) {
        map[asset] = DEFAULT_PRICES[asset] || "1.00";
      }
    }
    return map;
  }, [session.prices, uniqueAssets]);

  const handlePriceChange = (asset: string, value: string) => {
    // Allow only valid decimal numbers
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      const updated = { ...priceMap, [asset]: value };
      const priceEntries = Object.entries(updated).map(([a, usdPrice]) => ({
        asset: a,
        usdPrice,
      }));
      setPrices(priceEntries);
    }
  };

  const handleUsdInrChange = (value: string) => {
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setLocalUsdInr(value);
      setUsdInrRate(value);
    }
  };

  if (uniqueAssets.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-200">Pricing Inputs</h3>
        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <IconInfoCircle className="w-3.5 h-3.5" />
          <span>Used for tax calculation</span>
        </div>
      </div>

      {/* USD/INR Rate */}
      <div className="mb-6 p-4 rounded-lg bg-neutral-800/50 border border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <IconCurrencyDollar className="w-4 h-4 text-green-400" />
              <span className="text-neutral-300 text-sm">USD</span>
            </div>
            <span className="text-neutral-500">→</span>
            <div className="flex items-center gap-1">
              <IconCurrencyRupee className="w-4 h-4 text-orange-400" />
              <span className="text-neutral-300 text-sm">INR</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 text-sm">1 USD =</span>
            <input
              type="text"
              value={localUsdInr}
              onChange={(e) => handleUsdInrChange(e.target.value)}
              className="w-24 px-3 py-1.5 bg-neutral-900 border border-neutral-600 rounded text-right text-neutral-200 text-sm font-mono focus:outline-none focus:border-neutral-500"
            />
            <span className="text-neutral-500 text-sm">INR</span>
          </div>
        </div>
      </div>

      {/* Asset Prices */}
      <div className="space-y-2">
        <p className="text-sm text-neutral-400 mb-3">Asset Prices (USD)</p>
        {uniqueAssets.map((asset) => (
          <div
            key={asset}
            className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/30 border border-neutral-700/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-neutral-200 font-medium">{asset}</span>
              {DEFAULT_PRICES[asset] && (
                <span className="text-xs text-neutral-500">(demo)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-500 text-sm">$</span>
              <input
                type="text"
                value={priceMap[asset] || ""}
                onChange={(e) => handlePriceChange(asset, e.target.value)}
                placeholder="0.00"
                className="w-28 px-3 py-1.5 bg-neutral-900 border border-neutral-600 rounded text-right text-neutral-200 text-sm font-mono focus:outline-none focus:border-neutral-500"
              />
              <span className="text-neutral-500 text-sm">USD</span>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 p-3 rounded-lg bg-yellow-950/30 border border-yellow-900/50">
        <p className="text-xs text-yellow-400/80">
          <strong>Demo pricing:</strong> These are fixed demo values. In production, prices would
          come from reliable oracles (e.g., Chainlink) at the time of each transaction.
        </p>
      </div>
    </div>
  );
}
