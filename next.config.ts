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

  // Server Actions: o padrão de 1MB barra uploads de foto (avatar/capa) em
  // base64. As imagens já são comprimidas no cliente; isto é só folga extra.
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;