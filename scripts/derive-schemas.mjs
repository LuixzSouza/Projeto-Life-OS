// Deriva schemas Prisma por dialeto a partir do canônico (DATABASE_ROADMAP
// Fase 0/1). O prisma/schema.prisma (sqlite) continua o dono da verdade; este
// script copia o datamodel trocando o datasource e apontando o generator para
// um output PRÓPRIO — multi-banco no Prisma é multi-client gerado.
//
// Roda: node scripts/derive-schemas.mjs   (também via npm run db:derive)
// Regra de ouro: toda mudança de model = schema canônico → derivados →
// baselines, juntos (npm run db:baseline:all faz o ciclo completo).
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const CANONICAL = path.join(ROOT, "prisma", "schema.prisma");

const HEADER = `// ===================================================================
// ARQUIVO GERADO por scripts/derive-schemas.mjs - NAO EDITAR A MAO.
// Fonte da verdade: prisma/schema.prisma (sqlite). Mude la e rode
// "npm run db:derive" (ou db:baseline:all) para regenerar.
// ===================================================================

`;

/** Substitui os blocos generator/datasource preservando o datamodel. */
function derive(source, { provider, output }) {
  let out = source;

  // datasource db { provider = "sqlite" ... } -> provider do dialeto
  out = out.replace(
    /datasource\s+db\s*\{[\s\S]*?\}/,
    `datasource db {\n  provider = "${provider}"\n  url      = env("DATABASE_URL")\n}`
  );

  // generator client { ... } -> mesmo client + output proprio do dialeto
  out = out.replace(
    /generator\s+client\s*\{[\s\S]*?\}/,
    `generator client {\n  provider        = "prisma-client-js"\n  previewFeatures = ["driverAdapters"]\n  output          = "${output}"\n}`
  );

  return HEADER + out;
}

const source = fs.readFileSync(CANONICAL, "utf-8");

const targets = [
  {
    file: path.join(ROOT, "prisma", "schema.postgres.prisma"),
    provider: "postgresql",
    // Gerado como "pacote" em node_modules para o require em runtime
    // (serverExternalPackages no next.config) — mesmo padrão do libsql nativo.
    output: "../node_modules/@lifeos/client-postgres",
  },
  // MySQL (Fase 4) entra aqui quando chegar a vez:
  // { file: "prisma/schema.mysql.prisma", provider: "mysql", output: "../node_modules/@lifeos/client-mysql" },
];

for (const t of targets) {
  fs.writeFileSync(t.file, derive(source, t));
  console.log(`Schema derivado: ${path.relative(ROOT, t.file)} (provider ${t.provider})`);
}

console.log("Agora gere os clients: npm run db:generate:all");
