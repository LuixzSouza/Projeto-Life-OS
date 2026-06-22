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

/**
 * MySQL: o Prisma mapeia `String` para VARCHAR(191) — minusculo perto do TEXT
 * ILIMITADO que SQLite e Postgres dao ao mesmo `String`. Sem corrigir, notas,
 * imagens base64, JSON de treino e texto de IA seriam TRUNCADOS no MySQL.
 *
 * Promovemos cada campo `String`/`String?` ESCALAR e elegivel para @db.LongText
 * (ate 4GB — base64 passa de 64KB, entao TEXT/64KB nao basta), restaurando a
 * paridade de "texto ilimitado". Ficam de fora (continuam VARCHAR(191), pois
 * precisam ser indexaveis OU nao aceitam DEFAULT sendo TEXT):
 *   - linhas com @id, @unique ou @default;
 *   - campos referenciados em @relation(fields: [...]) (chaves estrangeiras);
 *   - campos em @@index, @@unique ou @@id.
 * Analise por MODEL (um nome protegido num model nao prende o mesmo nome noutro).
 */
function promoteMysqlLongText(source) {
  return source.replace(/model\s+\w+\s*\{[\s\S]*?\n\}/g, (block) => {
    const protectedNames = new Set();
    for (const m of block.matchAll(/@relation\([^)]*fields:\s*\[([^\]]+)\]/g)) {
      m[1].split(",").forEach((n) => protectedNames.add(n.trim()));
    }
    for (const m of block.matchAll(/@@(?:index|unique|id)\(\s*\[([^\]]+)\]/g)) {
      // tira eventual sort/length: `userId(sort: Desc)` -> `userId`
      m[1].split(",").forEach((n) => protectedNames.add(n.trim().replace(/[(\s].*/, "")));
    }
    // Arquivo CRLF: capturamos o \r final em grupo proprio (cr) para NAO inserir
    // o atributo DEPOIS do carriage return (que invalidaria a linha).
    return block.replace(
      /^([ \t]*)(\w+)([ \t]+)String(\??)([^\r\n]*)(\r?)$/gm,
      (line, indent, name, sp, opt, rest, cr) => {
        if (protectedNames.has(name)) return line;
        if (/@id\b|@unique\b|@default\b|@db\./.test(rest)) return line;
        return `${indent}${name}${sp}String${opt}${rest} @db.LongText${cr}`;
      },
    );
  });
}

/** Substitui os blocos generator/datasource preservando o datamodel. */
function derive(source, { provider, output, transform }) {
  let out = transform ? transform(source) : source;

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
  {
    // MySQL/MariaDB (Fase 4). Sem driver adapter no Prisma 5.22 (o
    // @prisma/adapter-mariadb só existe no Prisma 7) — então este client roda
    // pelo ENGINE NATIVO do Prisma, conectando direto pela URL, exatamente como
    // o SQLite local. Funciona em qualquer processo Node (desktop/VPS).
    file: path.join(ROOT, "prisma", "schema.mysql.prisma"),
    provider: "mysql",
    output: "../node_modules/@lifeos/client-mysql",
    // Sem isto, todo `String` viraria VARCHAR(191) e truncaria conteudo grande.
    transform: promoteMysqlLongText,
  },
];

for (const t of targets) {
  fs.writeFileSync(t.file, derive(source, t));
  console.log(`Schema derivado: ${path.relative(ROOT, t.file)} (provider ${t.provider})`);
}

console.log("Agora gere os clients: npm run db:generate:all");
