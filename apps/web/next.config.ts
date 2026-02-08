import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use empty turbopack config to silence the webpack warning
  turbopack: {},
  // Transpile wallet packages for SSR compatibility
  transpilePackages: [
    "@rainbow-me/rainbowkit",
    "@walletconnect/sign-client",
  ],
};

export default nextConfig;
