import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // FAL serves generated assets from its CDN; the booth and result pages render
  // them through next/image.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.fal.media" },
      { protocol: "https", hostname: "**.fal.ai" },
    ],
  },
  serverExternalPackages: ["sharp", "firebase-admin"],
  // This repo keeps its own hand-written CLAUDE.md; the generated AGENTS.md
  // pointer would overwrite it on every dev start.
  agentRules: false,
};

export default nextConfig;
