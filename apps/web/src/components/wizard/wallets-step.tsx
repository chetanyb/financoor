"use client";

import { useState } from "react";
import { useSession } from "@/lib/session";
import { IconPlus, IconTrash, IconWallet } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface WalletsStepProps {
  onNext: () => void;
  onBack: () => void;
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletsStep({ onNext, onBack }: WalletsStepProps) {
  const { session, addWallet, removeWallet, updateWallet } = useSession();
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [error, setError] = useState("");

  const handleAddWallet = () => {
    setError("");

    if (!newAddress.trim()) {
      setError("Please enter an address");
      return;
    }

    const address = newAddress.trim().toLowerCase();

    if (!isValidAddress(address)) {
      setError("Invalid Ethereum address format");
      return;
    }

    if (session.wallets.some((w) => w.address.toLowerCase() === address)) {
      setError("This address is already added");
      return;
    }

    addWallet(address, newLabel.trim() || undefined);
    setNewAddress("");
    setNewLabel("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddWallet();
    }
  };

  const handleContinue = () => {
    if (session.wallets.length > 0) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-200 mb-2">
          Add Your Wallets
        </h2>
        <p className="text-neutral-500 text-sm">
          Enter the Ethereum addresses you want to analyze for tax purposes.
        </p>
      </div>

      {/* Add wallet form */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="0x..."
            className="flex-1 px-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 font-mono text-sm"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Label (optional)"
            className="w-40 px-4 py-2.5 bg-neutral-800/50 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 text-sm"
          />
          <button
            onClick={handleAddWallet}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <IconPlus className="w-4 h-4" />
            Add
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Wallet list */}
      <div className="space-y-2">
        {session.wallets.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-neutral-700 text-center">
            <IconWallet className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              No wallets added yet. Add at least one wallet to continue.
            </p>
          </div>
        ) : (
          session.wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center gap-3 p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg group"
            >
              <div className="w-8 h-8 rounded-lg bg-neutral-700/50 flex items-center justify-center">
                <IconWallet className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-neutral-200">
                  {shortenAddress(wallet.address)}
                </p>
                {wallet.label ? (
                  <p className="text-xs text-neutral-500">{wallet.label}</p>
                ) : (
                  <input
                    type="text"
                    placeholder="Add label..."
                    className="text-xs text-neutral-500 bg-transparent border-none focus:outline-none w-full"
                    onBlur={(e) => {
                      if (e.target.value.trim()) {
                        updateWallet(wallet.id, { label: e.target.value.trim() });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const target = e.target as HTMLInputElement;
                        if (target.value.trim()) {
                          updateWallet(wallet.id, { label: target.value.trim() });
                        }
                        target.blur();
                      }
                    }}
                  />
                )}
              </div>
              <button
                onClick={() => removeWallet(wallet.id)}
                className="p-1.5 text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                <IconTrash className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-full font-medium text-neutral-400 hover:text-white transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={session.wallets.length === 0}
          className={cn(
            "px-6 py-2 rounded-full font-medium transition-colors",
            session.wallets.length > 0
              ? "bg-white text-black hover:bg-neutral-200"
              : "bg-neutral-700 text-neutral-500 cursor-not-allowed"
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
