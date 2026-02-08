"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FloatingDock } from "@/components/ui/floating-dock";
import { Spotlight } from "@/components/ui/spotlight";
import { SparklesCore } from "@/components/ui/sparkles";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { HoverCard3D } from "@/components/ui/card-3d";
import { resolveEnsSubdomains, type EnsSubdomain } from "@/lib/api";
import {
  IconHome,
  IconApps,
  IconTestPipe,
  IconShieldCheck,
  IconUsers,
  IconSearch,
  IconLoader2,
  IconArrowRight,
  IconUsersGroup,
  IconWallet,
  IconLink,
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

const useCases = [
  {
    icon: <IconUsersGroup className="w-8 h-8 text-purple-400" />,
    title: "Family Offices",
    description: "Manage all family member wallets under one ENS root",
  },
  {
    icon: <IconWallet className="w-8 h-8 text-blue-400" />,
    title: "DAOs & Clubs",
    description: "Organize treasury and member wallets as subdomains",
  },
  {
    icon: <IconLink className="w-8 h-8 text-emerald-400" />,
    title: "Investment Groups",
    description: "Track portfolio across multiple wallets with one lookup",
  },
];

export default function ClubPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<EnsSubdomain[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) return;

    // Normalize the query
    let domain = searchQuery.trim().toLowerCase();
    if (!domain.endsWith(".eth")) {
      domain = `${domain}.eth`;
    }

    setIsSearching(true);
    setSearchError(null);
    setPreviewResults(null);

    try {
      const result = await resolveEnsSubdomains(domain);

      if (result.subdomains.length === 0) {
        // No subdomains found, but domain might exist
        // Navigate anyway to show the domain page
        router.push(`/club/${encodeURIComponent(domain)}`);
      } else {
        // Show preview or navigate
        setPreviewResults(result.subdomains);
      }
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Failed to resolve ENS domain"
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewClub = () => {
    let domain = searchQuery.trim().toLowerCase();
    if (!domain.endsWith(".eth")) {
      domain = `${domain}.eth`;
    }
    router.push(`/club/${encodeURIComponent(domain)}`);
  };

  return (
    <div className="min-h-screen w-full bg-black/[0.96] antialiased relative overflow-hidden">
      {/* Spotlight effect */}
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="purple"
      />

      {/* Floating dock navigation */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50">
        <FloatingDock items={dockItems} />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] px-4">
        {/* Sparkles background */}
        <div className="absolute inset-0 w-full h-full">
          <SparklesCore
            id="club-sparkles"
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={50}
            className="w-full h-full"
            particleColor="#8B5CF6"
          />
        </div>

        {/* Hero content */}
        <div className="relative z-20 text-center max-w-4xl mx-auto">
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">
              <IconUsers className="w-4 h-4" />
              ENS-Powered Organization
            </span>
          </div>

          <TextGenerateEffect
            words="ENS Club Hub"
            className="text-5xl md:text-7xl font-bold text-white mb-4"
          />

          <p className="text-lg md:text-xl text-neutral-400 mb-8 max-w-2xl mx-auto">
            Discover and manage your ENS domain as a club. Add members as subdomains,
            import wallets, and calculate taxes for your entire organization.
          </p>

          {/* Search form */}
          <form onSubmit={handleSearch} className="relative max-w-xl mx-auto mb-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
              <div className="relative flex items-center bg-neutral-900 rounded-xl border border-neutral-800">
                <IconSearch className="w-5 h-5 text-neutral-500 ml-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter ENS domain (e.g., family.eth)"
                  className="flex-1 px-4 py-4 bg-transparent text-white placeholder:text-neutral-500 focus:outline-none text-lg"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="mr-2 px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isSearching ? (
                    <>
                      <IconLoader2 className="w-4 h-4 animate-spin" />
                      Searching
                    </>
                  ) : (
                    <>
                      Explore
                      <IconArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Search error */}
          {searchError && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-950/50 border border-red-800/50 text-red-400 text-sm max-w-xl mx-auto">
              {searchError}
            </div>
          )}

          {/* Preview results */}
          {previewResults && (
            <div className="mb-8 p-6 rounded-2xl bg-neutral-900/80 border border-purple-800/30 max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <IconUsers className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">
                    {previewResults.length} member{previewResults.length !== 1 ? "s" : ""} found
                  </span>
                </div>
                <button
                  onClick={handleViewClub}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  View Club
                  <IconArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {previewResults.slice(0, 4).map((member) => (
                  <div
                    key={member.name}
                    className="px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 text-sm"
                  >
                    <span className="text-neutral-300">{member.label}</span>
                    <span className="text-neutral-600">.{searchQuery.replace(".eth", "")}.eth</span>
                  </div>
                ))}
                {previewResults.length > 4 && (
                  <div className="px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 text-sm text-neutral-500">
                    +{previewResults.length - 4} more
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-neutral-500">
            Try: <button onClick={() => setSearchQuery("vitalik.eth")} className="text-purple-400 hover:text-purple-300">vitalik.eth</button>
            {" "}or{" "}
            <button onClick={() => setSearchQuery("ens.eth")} className="text-purple-400 hover:text-purple-300">ens.eth</button>
          </p>
        </div>
      </div>

      {/* Use Cases Section */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 pb-32">
        <h2 className="text-2xl font-bold text-white text-center mb-8">
          Perfect for
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {useCases.map((useCase, idx) => (
            <HoverCard3D key={idx}>
              <div className="p-6 rounded-2xl bg-neutral-900/50 border border-neutral-800 h-full">
                <div className="w-14 h-14 rounded-xl bg-neutral-800/50 flex items-center justify-center mb-4">
                  {useCase.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {useCase.title}
                </h3>
                <p className="text-neutral-400 text-sm">
                  {useCase.description}
                </p>
              </div>
            </HoverCard3D>
          ))}
        </div>

        {/* CTA to main app */}
        <div className="mt-16 text-center">
          <p className="text-neutral-500 mb-4">
            Already have wallets set up?
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium transition-colors"
          >
            <IconApps className="w-5 h-5" />
            Go to Tax App
          </Link>
        </div>
      </div>
    </div>
  );
}
