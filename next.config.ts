import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.100.153'],
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
