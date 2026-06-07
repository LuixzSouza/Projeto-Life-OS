import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // libSQL build NODE (réplica embarcada) importa um binário NATIVO (`libsql`).
  // Mantemos esses pacotes FORA do bundle do webpack: são resolvidos do
  // node_modules em runtime (via require). Sem isto, o webpack tenta empacotar o
  // nativo e o `require` em runtime falha com "dynamic usage of require".
  // A nuvem (Vercel) usa só `@libsql/client/web` (JS puro) e nunca carrega o nativo.
  serverExternalPackages: ["@libsql/client", "libsql"],

  // Configurações de imagem
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "**" }
    ]
  },
  
  // Type-safety no build: o código está 100% type-clean (tsc --noEmit = 0 erros),
  // então deixamos o build FALHAR em erros de tipo — pega bugs cedo, não os esconde.

  // Server Actions: o padrão de 1MB barra uploads de foto (avatar/capa) em
  // base64. As imagens já são comprimidas no cliente; isto é só folga extra.
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
    // Tree-shaking de barrel imports: importa só o que é usado destas libs
    // grandes, reduzindo o JS enviado ao navegador (bundle menor = mais rápido).
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "date-fns",
      "@radix-ui/react-icons",
    ],
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