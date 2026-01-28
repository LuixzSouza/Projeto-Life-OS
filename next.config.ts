import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configurações de imagem
  images: { 
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  
  // Ignorar erros de TypeScript no build (ainda suportado no config)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;