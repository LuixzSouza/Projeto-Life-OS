import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ❌ REMOVA ESTA LINHA: output: 'export', 
  
  // Mantenha o resto:
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;