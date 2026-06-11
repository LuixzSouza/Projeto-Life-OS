import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // DISTRIBUICAO Fase 0: build auto-contido p/ o instalador de amigos.
  // Opt-in via env para NÃO mudar o fluxo pessoal (`npm start`/launcher usam
  // o build normal). O dist script (Fase 1) roda com LIFE_OS_STANDALONE=1 e
  // copia os nativos externalizados (libsql/Prisma engine) para o bundle.
  ...(process.env.LIFE_OS_STANDALONE === "1" ? { output: "standalone" as const } : {}),

  // libSQL build NODE (réplica embarcada) importa um binário NATIVO (`libsql`).
  // Mantemos esses pacotes FORA do bundle do webpack: são resolvidos do
  // node_modules em runtime (via require). Sem isto, o webpack tenta empacotar o
  // nativo e o `require` em runtime falha com "dynamic usage of require".
  // A nuvem (Vercel) usa só `@libsql/client/web` (JS puro) e nunca carrega o nativo.
  // Postgres (DATABASE_ROADMAP Fase 1): o client derivado é gerado em
  // node_modules/@lifeos/client-postgres e carregado em runtime (require),
  // como o libsql — fora do bundle, resolvido do node_modules.
  serverExternalPackages: ["@libsql/client", "libsql", "pg", "@lifeos/client-postgres", "@prisma/adapter-pg"],

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
    "/**": ["./prisma/baseline.sql", "./prisma/baseline.postgres.sql"],
  },
};

export default nextConfig;