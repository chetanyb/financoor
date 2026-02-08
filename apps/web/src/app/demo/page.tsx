"use client";

import { useState } from "react";
import { FloatingDock } from "@/components/ui/floating-dock";
import {
  IconHome,
  IconApps,
  IconTestPipe,
  IconShieldCheck,
  IconExternalLink,
  IconLoader2,
  IconCheck,
  IconWallet,
  IconDroplet,
  IconTrendingUp,
  IconTrendingDown,
  IconPlant,
  IconCoins,
  IconUsers,
} from "@tabler/icons-react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { CONTRACTS } from "@/lib/wagmi";
import {
  demoTokenAbi,
  profitMachineAbi,
  lossMachineAbi,
  yieldFarmAbi,
} from "@/lib/contracts";

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
    title: "Club",
    icon: <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/club",
  },
  {
    title: "Verify",
    icon: <IconShieldCheck className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/verify",
  },
  {
    title: "Demo",
    icon: <IconTestPipe className="h-full w-full text-neutral-500 dark:text-neutral-300" />,
    href: "/demo",
  },
];

function ActionButton({
  onClick,
  loading,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "success" | "danger";
}) {
  const colors = {
    primary: "bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50",
    secondary: "bg-neutral-700 hover:bg-neutral-600 disabled:bg-neutral-700/50",
    success: "bg-green-600 hover:bg-green-500 disabled:bg-green-600/50",
    danger: "bg-red-600 hover:bg-red-500 disabled:bg-red-600/50",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 disabled:cursor-not-allowed ${colors[variant]}`}
    >
      {loading && <IconLoader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function FaucetSection() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.demoToken,
    abi: demoTokenAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  const handleFaucet = () => {
    writeContract({
      address: CONTRACTS.demoToken,
      abi: demoTokenAbi,
      functionName: "faucet",
    });
  };

  // Refetch balance after success
  if (isSuccess) {
    refetchBalance();
  }

  return (
    <div className="rounded-xl border border-blue-800/50 bg-blue-950/20 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <IconDroplet className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">DEMODOLLAH Faucet</h3>
          <p className="text-sm text-neutral-500">Get 10,000 DEMO tokens for free</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-neutral-800/50">
        <span className="text-sm text-neutral-400">Your Balance:</span>
        <span className="text-lg font-mono text-white">
          {balance ? formatUnits(balance as bigint, 18) : "0"} DEMO
        </span>
      </div>

      <ActionButton
        onClick={handleFaucet}
        loading={isPending || isConfirming}
        disabled={!address}
        variant="primary"
      >
        {isSuccess ? (
          <>
            <IconCheck className="w-4 h-4" />
            Tokens Received!
          </>
        ) : (
          <>
            <IconDroplet className="w-4 h-4" />
            Get DEMO Tokens
          </>
        )}
      </ActionButton>

      {hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          View transaction <IconExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function ProfitMachineSection() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("100");
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [step, setStep] = useState<"approve" | "deposit">("approve");

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.demoToken,
    abi: demoTokenAbi,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.profitMachine] : undefined,
  });

  const parsedAmount = parseUnits(amount || "0", 18);
  const hasAllowance = allowance !== undefined && (allowance as bigint) >= parsedAmount;

  const handleApprove = () => {
    setStep("approve");
    writeContract({
      address: CONTRACTS.demoToken,
      abi: demoTokenAbi,
      functionName: "approve",
      args: [CONTRACTS.profitMachine, parsedAmount],
    });
  };

  const handleDeposit = () => {
    setStep("deposit");
    writeContract({
      address: CONTRACTS.profitMachine,
      abi: profitMachineAbi,
      functionName: "deposit",
      args: [parsedAmount],
    });
  };

  if (isSuccess && step === "approve") {
    refetchAllowance();
    reset();
  }

  return (
    <div className="rounded-xl border border-green-800/50 bg-green-950/20 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
          <IconTrendingUp className="w-5 h-5 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">ProfitMachine</h3>
          <p className="text-sm text-green-400/70">Deposit DEMO → Get 2x back (gains)</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm text-neutral-400 mb-2 block">Amount to deposit:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white font-mono"
          placeholder="100"
        />
      </div>

      <div className="flex gap-2">
        {!hasAllowance ? (
          <ActionButton
            onClick={handleApprove}
            loading={(isPending || isConfirming) && step === "approve"}
            disabled={!address}
            variant="primary"
          >
            1. Approve
          </ActionButton>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-900/30 border border-green-700/50 text-green-400 text-sm">
            <IconCheck className="w-4 h-4" />
            Approved
          </div>
        )}

        <ActionButton
          onClick={handleDeposit}
          loading={(isPending || isConfirming) && step === "deposit"}
          disabled={!address || !hasAllowance}
          variant="success"
        >
          {isSuccess && step === "deposit" ? (
            <>
              <IconCheck className="w-4 h-4" />
              Done!
            </>
          ) : (
            hasAllowance ? "Deposit" : "2. Deposit"
          )}
        </ActionButton>
      </div>

      {hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
        >
          View transaction <IconExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function LossMachineSection() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("100");
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [step, setStep] = useState<"approve" | "deposit">("approve");

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.demoToken,
    abi: demoTokenAbi,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.lossMachine] : undefined,
  });

  const parsedAmount = parseUnits(amount || "0", 18);
  const hasAllowance = allowance !== undefined && (allowance as bigint) >= parsedAmount;

  const handleApprove = () => {
    setStep("approve");
    writeContract({
      address: CONTRACTS.demoToken,
      abi: demoTokenAbi,
      functionName: "approve",
      args: [CONTRACTS.lossMachine, parsedAmount],
    });
  };

  const handleDeposit = () => {
    setStep("deposit");
    writeContract({
      address: CONTRACTS.lossMachine,
      abi: lossMachineAbi,
      functionName: "deposit",
      args: [parsedAmount],
    });
  };

  if (isSuccess && step === "approve") {
    refetchAllowance();
    reset();
  }

  return (
    <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <IconTrendingDown className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">LossMachine</h3>
          <p className="text-sm text-red-400/70">Deposit DEMO → Get 0.5x back (losses)</p>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm text-neutral-400 mb-2 block">Amount to deposit:</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white font-mono"
          placeholder="100"
        />
      </div>

      <div className="flex gap-2">
        {!hasAllowance ? (
          <ActionButton
            onClick={handleApprove}
            loading={(isPending || isConfirming) && step === "approve"}
            disabled={!address}
            variant="primary"
          >
            1. Approve
          </ActionButton>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-900/30 border border-green-700/50 text-green-400 text-sm">
            <IconCheck className="w-4 h-4" />
            Approved
          </div>
        )}

        <ActionButton
          onClick={handleDeposit}
          loading={(isPending || isConfirming) && step === "deposit"}
          disabled={!address || !hasAllowance}
          variant="danger"
        >
          {isSuccess && step === "deposit" ? (
            <>
              <IconCheck className="w-4 h-4" />
              Done!
            </>
          ) : (
            hasAllowance ? "Deposit" : "2. Deposit"
          )}
        </ActionButton>
      </div>

      {hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
        >
          View transaction <IconExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function YieldFarmSection() {
  const { address } = useAccount();
  const [stakeAmount, setStakeAmount] = useState("100");
  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const [action, setAction] = useState<"approve" | "stake" | "claim" | "unstake">("approve");

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.demoToken,
    abi: demoTokenAbi,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.yieldFarm] : undefined,
  });

  // stakes returns a tuple: [amount, startBlock, claimedRewards]
  const { data: stakeData, refetch: refetchStaked } = useReadContract({
    address: CONTRACTS.yieldFarm,
    abi: yieldFarmAbi,
    functionName: "stakes",
    args: address ? [address] : undefined,
  });

  const { data: pendingRewards, refetch: refetchRewards } = useReadContract({
    address: CONTRACTS.yieldFarm,
    abi: yieldFarmAbi,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
  });

  // Extract staked amount from tuple
  const stakedAmount = stakeData ? (stakeData as [bigint, bigint, bigint])[0] : BigInt(0);

  const parsedStakeAmount = parseUnits(stakeAmount || "0", 18);
  const hasAllowance = allowance !== undefined && (allowance as bigint) >= parsedStakeAmount;

  const handleApprove = () => {
    setAction("approve");
    writeContract({
      address: CONTRACTS.demoToken,
      abi: demoTokenAbi,
      functionName: "approve",
      args: [CONTRACTS.yieldFarm, parsedStakeAmount],
    });
  };

  const handleStake = () => {
    setAction("stake");
    writeContract({
      address: CONTRACTS.yieldFarm,
      abi: yieldFarmAbi,
      functionName: "stake",
      args: [parsedStakeAmount],
    });
  };

  const handleClaim = () => {
    setAction("claim");
    writeContract({
      address: CONTRACTS.yieldFarm,
      abi: yieldFarmAbi,
      functionName: "claimRewards",
    });
  };

  const handleUnstake = () => {
    setAction("unstake");
    writeContract({
      address: CONTRACTS.yieldFarm,
      abi: yieldFarmAbi,
      functionName: "unstake",
    });
  };

  if (isSuccess) {
    refetchAllowance();
    refetchStaked();
    refetchRewards();
    reset();
  }

  return (
    <div className="rounded-xl border border-purple-800/50 bg-purple-950/20 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
          <IconPlant className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-200">YieldFarm</h3>
          <p className="text-sm text-purple-400/70">Stake DEMO → Earn 10% rewards per block</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-neutral-800/50">
          <p className="text-xs text-neutral-500 mb-1">Your Staked</p>
          <p className="text-lg font-mono text-white">
            {formatUnits(stakedAmount, 18)} DEMO
          </p>
        </div>
        <div className="p-3 rounded-lg bg-neutral-800/50">
          <p className="text-xs text-neutral-500 mb-1">Pending Rewards</p>
          <p className="text-lg font-mono text-green-400">
            {pendingRewards ? formatUnits(pendingRewards as bigint, 18) : "0"} DEMO
          </p>
        </div>
      </div>

      {/* Stake */}
      <div className="mb-4">
        <label className="text-sm text-neutral-400 mb-2 block">Stake amount:</label>
        <div className="flex gap-2">
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white font-mono"
            placeholder="100"
          />
          {!hasAllowance ? (
            <ActionButton
              onClick={handleApprove}
              loading={(isPending || isConfirming) && action === "approve"}
              disabled={!address}
              variant="primary"
            >
              Approve
            </ActionButton>
          ) : (
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-green-900/30 border border-green-700/50 text-green-400 text-sm">
              <IconCheck className="w-4 h-4" />
            </div>
          )}
          <ActionButton
            onClick={handleStake}
            loading={(isPending || isConfirming) && action === "stake"}
            disabled={!address || !hasAllowance}
            variant="success"
          >
            Stake
          </ActionButton>
        </div>
      </div>

      {/* Claim Rewards */}
      <div className="flex gap-2 mb-3">
        <ActionButton
          onClick={handleClaim}
          loading={(isPending || isConfirming) && action === "claim"}
          disabled={!address || !pendingRewards || (pendingRewards as bigint) === BigInt(0)}
          variant="success"
        >
          <IconCoins className="w-4 h-4" />
          Claim All Rewards
        </ActionButton>
      </div>

      {/* Unstake */}
      <div className="flex gap-2">
        <ActionButton
          onClick={handleUnstake}
          loading={(isPending || isConfirming) && action === "unstake"}
          disabled={!address || stakedAmount === BigInt(0)}
          variant="secondary"
        >
          Unstake All ({formatUnits(stakedAmount, 18)} DEMO)
        </ActionButton>
      </div>

      {hash && (
        <a
          href={`https://sepolia.etherscan.io/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
        >
          View transaction <IconExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

export default function DemoPage() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative">
      {/* Floating dock navigation */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-16 pb-32">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Demo Contracts</h1>
            <p className="text-neutral-500 mt-1">Generate on-chain activity on Sepolia</p>
          </div>
          <ConnectButton />
        </div>

        {!isConnected ? (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-8 text-center">
            <IconWallet className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-neutral-200 mb-2">Connect Your Wallet</h2>
            <p className="text-neutral-500 mb-6">
              Connect your wallet to interact with demo contracts on Sepolia
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Step 1: Get tokens */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">
                  1
                </span>
                Get Demo Tokens
              </h2>
              <FaucetSection />
            </div>

            {/* Step 2: Generate gains */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm">
                  2
                </span>
                Generate Gains (2x return)
              </h2>
              <ProfitMachineSection />
            </div>

            {/* Step 3: Generate losses */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-sm">
                  3
                </span>
                Generate Losses (0.5x return)
              </h2>
              <LossMachineSection />
            </div>

            {/* Step 4: Stake for yield */}
            <div>
              <h2 className="text-lg font-semibold text-neutral-300 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">
                  4
                </span>
                Earn Yield (10% per block)
              </h2>
              <YieldFarmSection />
            </div>

            {/* Next steps */}
            <div className="rounded-xl border border-neutral-700 bg-neutral-800/30 p-5 mt-8">
              <h3 className="text-lg font-semibold text-neutral-200 mb-2">Next Steps</h3>
              <p className="text-neutral-400 text-sm mb-4">
                After generating transactions, go to the App to sync your wallet and calculate taxes.
              </p>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
              >
                <IconApps className="w-4 h-4" />
                Go to App
              </Link>
            </div>

            {/* Contract addresses */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 p-5">
              <h3 className="text-sm font-medium text-neutral-400 mb-3">Contract Addresses</h3>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-neutral-500">DemoToken:</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONTRACTS.demoToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {CONTRACTS.demoToken}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">ProfitMachine:</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONTRACTS.profitMachine}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {CONTRACTS.profitMachine}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">LossMachine:</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONTRACTS.lossMachine}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {CONTRACTS.lossMachine}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">YieldFarm:</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${CONTRACTS.yieldFarm}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {CONTRACTS.yieldFarm}
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
