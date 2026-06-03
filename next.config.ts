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

  // CRÍTICO (Vercel): o `ensureSchema()` lê `prisma/baseline.sql` via fs em
  // runtime. O rastreamento de arquivos do Next só inclui imports estáticos —
  // leituras dinâmicas de arquivo NÃO são detectadas, então o baseline ficava
  // de fora da função serverless e o setup quebrava com 500 ("Baseline não
  // encontrado"). Forçamos a inclusão do arquivo no bundle de toda rota.
  outputFileTracingIncludes: {
    "/**": ["./prisma/baseline.sql"],
  },
};

export default nextConfig;