import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      sharp: { browser: "" },
      "onnxruntime-node": { browser: "" },
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  serverExternalPackages: ["@huggingface/transformers"],
};

export default nextConfig;
