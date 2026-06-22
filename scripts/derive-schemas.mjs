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

// Limite de chave do InnoDB (row_format DYNAMIC, MySQL 8.x). Um indice cujo
// somatorio de bytes das colunas passe disto falha com erro 1071.
const MYSQL_MAX_KEY_BYTES = 3072;
const UTF8MB4_BYTES_PER_CHAR = 4; // utf8mb4 (emoji-safe) = 4 bytes/char no pior caso.

/**
 * Ajusta os tipos de coluna String na derivacao do MySQL (nao toca o canonico):
 *
 * 1) VARCHAR(191) -> LONGTEXT nos campos de CONTEUDO. O Prisma mapeia `String`
 *    para VARCHAR(191) no MySQL — minusculo perto do TEXT ILIMITADO que SQLite e
 *    Postgres dao ao mesmo `String`. Sem corrigir, notas, base64, JSON de treino
 *    e texto de IA seriam TRUNCADOS. Promovidos a @db.LongText (ate 4GB; base64
 *    passa de 64KB, entao TEXT/64KB nao basta). NAO promovidos (seguem VARCHAR,
 *    pois precisam ser indexaveis OU TEXT nao aceita DEFAULT):
 *      - linhas com @id, @unique ou @default;
 *      - campos em @relation(fields: [...]) (FKs) ou em @@index/@@unique/@@id.
 *
 * 2) VARCHAR(191) -> VARCHAR(N) menor nas colunas string de indices COMPOSTOS
 *    grandes. 5 colunas VARCHAR(191) utf8mb4 = 3820 bytes > 3072 (erro 1071 do
 *    InnoDB) — limite que nao existe no SQLite/Postgres. Encurtamos so o
 *    necessario para o indice caber (ex.: EntityLink, unique de 5 colunas).
 *
 * Analise por MODEL (um nome protegido num model nao prende o mesmo nome noutro).
 */
function adjustMysqlStringColumns(source) {
  return source.replace(/model\s+\w+\s*\{[\s\S]*?\n\}/g, (block) => {
    // Campos String ESCALARES do model (nome -> true).
    const stringFields = new Set();
    for (const m of block.matchAll(/^[ \t]*(\w+)[ \t]+String\??/gm)) stringFields.add(m[1]);

    const protectedNames = new Set();
    for (const m of block.matchAll(/@relation\([^)]*fields:\s*\[([^\]]+)\]/g)) {
      m[1].split(",").forEach((n) => protectedNames.add(n.trim()));
    }
    // Indices compostos: protege os campos e calcula o teto de VARCHAR quando o
    // indice estouraria 3072 bytes assumindo VARCHAR(191) em todas as strings.
    const capByField = new Map();
    for (const m of block.matchAll(/@@(?:index|unique|id)\(\s*\[([^\]]+)\]/g)) {
      const fields = m[1].split(",").map((n) => n.trim().replace(/[(\s].*/, ""));
      fields.forEach((n) => protectedNames.add(n));
      const strCount = fields.filter((n) => stringFields.has(n)).length;
      // 4 x VARCHAR(191) = 3056 < 3072 (cabe). A partir de 5 strings, estoura.
      if (strCount >= 5) {
        // Margem de 72 bytes p/ partes nao-string (datas/ints) e overhead.
        const cap = Math.floor((MYSQL_MAX_KEY_BYTES - 72) / strCount / UTF8MB4_BYTES_PER_CHAR);
        for (const n of fields) {
          if (!stringFields.has(n)) continue;
          capByField.set(n, Math.min(capByField.get(n) ?? Infinity, cap));
        }
      }
    }

    // Arquivo CRLF: capturamos o \r final em grupo proprio (cr) para NAO inserir
    // o atributo DEPOIS do carriage return (que invalidaria a linha).
    return block.replace(
      /^([ \t]*)(\w+)([ \t]+)String(\??)([^\r\n]*)(\r?)$/gm,
      (line, indent, name, sp, opt, rest, cr) => {
        // Separa um eventual comentario inline (" // ...") para inserir o
        // atributo ANTES dele — senao o @db.* cairia DENTRO do comentario.
        const cm = rest.match(/\s+\/\/.*$/);
        const comment = cm ? cm[0] : "";
        const code = comment ? rest.slice(0, rest.length - comment.length) : rest;
        const head = `${indent}${name}${sp}String${opt}${code}`;
        // (2) Teto de VARCHAR para caber no indice composto. Vem ANTES do guard
        // de @default porque VARCHAR (ao contrario de TEXT) aceita DEFAULT.
        if (capByField.has(name)) {
          return `${head} @db.VarChar(${capByField.get(name)})${comment}${cr}`;
        }
        if (protectedNames.has(name)) return line;
        if (/@id\b|@unique\b|@default\b|@db\./.test(code)) return line;
        // (1) Conteudo livre -> texto ilimitado.
        return `${head} @db.LongText${comment}${cr}`;
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
    // Sem isto: todo `String` viraria VARCHAR(191) (trunca conteudo grande) e
    // indices compostos de 5+ strings estourariam o limite de chave do InnoDB.
    transform: adjustMysqlStringColumns,
  },
];

for (const t of targets) {
  fs.writeFileSync(t.file, derive(source, t));
  console.log(`Schema derivado: ${path.relative(ROOT, t.file)} (provider ${t.provider})`);
}

console.log("Agora gere os clients: npm run db:generate:all");
