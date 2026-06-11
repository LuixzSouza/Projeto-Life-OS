# 🗄️ Roadmap Multi-Banco — escolha onde seus dados moram

> Plano honesto para o Life OS aceitar **qualquer banco** (Supabase, Postgres,
> MySQL, MongoDB...) além do trio atual (Local / Turso / Híbrido), priorizado
> por impacto × esforço. Atualizado em 10/jun/2026. Arquivos citados são os
> reais do projeto.

---

## ✅ O que JÁ temos (a fundação é melhor do que parece)

| Capacidade | Onde vive |
|---|---|
| Perfil de conexão tipado (`local` \| `cloud` \| `replica`) | `lib/db-config.ts` (`DbProfile`) |
| Prisma reconectável em runtime (troca de banco SEM reiniciar) | `lib/prisma.ts` (Proxy + `reconnectPrisma`) |
| Driver adapter já em uso (libSQL/Turso via `driverAdapters`) | `lib/prisma.ts` (`buildAdapterClient`) |
| Schema criado em runtime sem CLI (`ensureSchema` + reconcílio aditivo) | `lib/db-bootstrap.ts` + `prisma/baseline.sql` |
| Env vars com prioridade sobre config (serverless-safe) | `lib/db-config.ts` (`getEnvProfile`) |
| Wizard com cards de provedores (Postgres/Supabase/MySQL/Mongo já desenhados como "Em breve") | `components/setup/wizard-types.ts` (`DB_PROVIDERS`) |
| **Export/import JSON 100% dos models (v3, IDs preservados)** ✅ Fase 0.3 ENTREGUE 11/jun/2026 | `lib/full-backup.ts` (registro pai→filho de 67 models) + `/api/backup` + `importJsonData` |
| Validação de backup (dry-run com contagens) + backup automático diário c/ rotação | `validateBackupFile` + `lib/auto-backup.ts` |
| Diagnóstico de conexão pré-deploy | `npm run db:probe` (`scripts/turso-probe.mjs`) |
| Erros de conexão traduzidos p/ humanos | `friendlyError()` em `app/actions/setup.ts` |

---

## 🧱 A restrição que define TUDO (ler antes de codar)

O client do Prisma é **gerado** para um dialeto: hoje `provider = "sqlite"`
(`prisma/schema.prisma`). Um client gerado p/ sqlite **não conecta** em
Postgres nem Mongo — não é questão de URL, é o código gerado.

Consequência: multi-banco = **multi-client gerado**. A estratégia é:

1. **Um schema canônico** (`prisma/schema.prisma`, sqlite — continua o dono da verdade).
2. **Script derivador** (`scripts/derive-schemas.mjs`): copia o canônico trocando
   o bloco `datasource` (e atributos específicos de dialeto) →
   `prisma/schema.postgres.prisma`, `prisma/schema.mysql.prisma`...
3. Cada schema gera client em **output próprio** (`node_modules/@lifeos/client-postgres`
   ou `prisma/clients/postgres`), via `npm run db:generate:all`.
4. O `buildAdapterClient` em `lib/prisma.ts` ganha um ramo por provider e
   instancia o client certo + driver adapter certo. O **Proxy continua o mesmo** —
   nenhum dos ~100 imports de `prisma` espalhados pelo app muda.
5. Tipagem: o app continua importando tipos de `@prisma/client` (o canônico).
   Os clients derivados são estruturalmente idênticos (mesmos models), então o
   cast acontece em UM lugar (`buildAdapterClient`), tipado com a interface comum.

O mesmo vale pro `baseline.sql`: ele é dialeto SQLite. Cada provider precisa do
seu, gerado com a ferramenta oficial:
`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.postgres.prisma --script`
→ `prisma/baseline.postgres.sql`. O `ensureSchema` vira dialect-aware.

---

## 🥇 FASE 0 — Fundações (pré-requisito de tudo, sem UI nova)

**Objetivo:** nenhum banco novo ainda — deixar o núcleo pronto p/ receber qualquer um.

1. **Expandir o `DbProfile`** (`lib/db-config.ts`):
   `provider: "turso" | "postgres" | "supabase" | "mysql" | "mongodb"` no modo
   `cloud` (Supabase é Postgres com açúcar — mesmo ramo, detecção própria).
   `getEnvProfile()` passa a reconhecer `postgres://`, `postgresql://`, `mysql://`,
   `mongodb+srv://` em `DATABASE_URL` (hoje só aceita `libsql|https`).
2. **Auditoria de SQL cru** — só 4 arquivos falam dialeto SQLite direto:
   - `lib/db-bootstrap.ts` (baseline + `PRAGMA table_info`)
   - `lib/db-migrate.ts` (`sqlite_master` — merge local→nuvem)
   - `app/(dashboard)/settings/actions/maintenance.ts` (VACUUM, integrity_check)
   - `app/(dashboard)/settings/actions/storage.ts`
   Criar `lib/db-dialect.ts` com `getDialect(profile)` e gates explícitos
   (os guards por modo da tela Dados & Sistema já existem — viram guards por *dialeto*).
3. **Completar o export/import JSON p/ 100% dos models** — hoje `importJsonData`
   não cobre aiMessages, CRM, mídia, closet, conexões. Esse JSON é a **ponte
   universal de migração entre bancos** (SQLite→Supabase, Turso→Mongo...). Sem
   isso, trocar de banco = perder dados. É o item de maior valor da fase.
4. **Isolar workarounds do libSQL** — os contornos de `_max`/`_min` de DateTime e
   de DateTime em `$transaction` (ver memórias do projeto) são bugs DO LIBSQL,
   não do Postgres. Marcar esses pontos com o gate de dialeto p/ não levar a
   gambiarra junto.
5. **Decidir o upgrade do Prisma** — estamos pinados em `@prisma/adapter-libsql@5.22`
   + combo testado `@libsql/client@0.17.3`/`libsql@0.5.29`. Os adapters de
   Postgres/MySQL são mais maduros no Prisma 6.x. Subir é desejável, mas o combo
   da réplica foi calibrado a mão — testar sync/cloud/local ANTES de mergear.
   (Lembrar: parar `npm run dev` antes de `prisma generate` — lock de DLL no Windows.)

**Esforço:** médio. **Risco:** baixo (refactor interno, zero mudança visível).

---

## 🥈 FASE 1 — PostgreSQL genérico (1 fase, 4 provedores de brinde)

Suportar **Postgres** cobre de uma vez: Supabase, Neon, Railway, RDS e
self-hosted. É disparado o melhor custo×benefício.

1. Deps: `@prisma/adapter-pg` + `pg` (HTTP-less, mas serverless-safe com pool=1).
2. `scripts/derive-schemas.mjs` + `prisma/schema.postgres.prisma` + client gerado
   em output próprio (ver seção da restrição).
3. `prisma/baseline.postgres.sql` via `migrate diff`; `ensureSchema` recebe o
   baseline certo pelo dialeto (o parser de reconcílio aditivo precisa entender
   `ALTER TABLE ... ADD COLUMN` do Postgres — sintaxe quase igual, tipos diferem).
4. `buildAdapterClient`: ramo `provider === "postgres" || "supabase"` →
   `new PrismaClient({ adapter: new PrismaPg(pool) })` com o client postgres gerado.
5. **Atenção a tipos:** `Decimal` (User.salary, finanças) e `DateTime` têm
   representação diferente — o Prisma normaliza, mas o código que compara
   `typeof createdAt === "text"` (dedupe do sync) é SQLite-only; gate.
   A regra do `T12:00:00Z` (CLAUDE.md) continua valendo — é client-side.
6. Wizard: virar `available: true` no card PostgreSQL; campos = connection string
   (+ teste de conexão reaproveitando o padrão do `testTursoConnection`).
7. `scripts/db-probe-postgres.mjs` (ou generalizar o `db:probe` atual por provider).
8. `friendlyError()`: traduzir os erros clássicos de Postgres (senha, SSL
   `sslmode=require`, IPv6, db inexistente).
9. Docker compose de dev (`docker-compose.db.yml` com postgres) + smoke test:
   setup → ensureSchema → CRUD de 3 módulos → export/import.

**Esforço:** alto (é a fase que paga a arquitetura). **Impacto:** altíssimo.
**Fora de escopo desta fase:** modo réplica com Postgres (réplica embarcada é
exclusividade libSQL — Postgres é só `cloud`). Deixar isso claro na UI.

---

## 🥉 FASE 2 — Supabase como experiência de primeira classe ✅ ENTREGUE 11/jun/2026

Tecnicamente já funciona pela Fase 1 (é Postgres). Esta fase é UX + pegadinhas:

1. **Detecção**: URL `*.supabase.co` / `*.pooler.supabase.com` → `provider: "supabase"`
   (card próprio, ícone verde, badge "Ativo").
2. **Pooler obrigatório em serverless**: no Vercel a conexão deve ser via
   Supavisor em *transaction mode* (porta 6543) e **sem prepared statements**
   (configurar no `pg`/adapter). Conexão direta (5432) só p/ desktop. O wizard
   detecta a porta e orienta — essa é A pegadinha que vai gerar issue se ignorada.
3. Validações pré-conexão no estilo `assertValidCloudProfile()` (a lição do
   token-Turso-na-variável-errada se repete aqui com senha/ref do projeto).
4. Passo a passo no wizard: criar projeto grátis → Settings → Database →
   connection string (URI, pooler) — espelhando o fluxo que o card Turso já tem.
5. Docs: seção própria em `docs/DATABASE.md` + env vars (`DATABASE_URL` +
   `JWT_SECRET` + `ENCRYPTION_KEY`; a lição dos 3 segredos de plataforma vale igual).

**Esforço:** baixo-médio (a base veio da Fase 1). **Impacto:** alto — Supabase é
o pedido nº 1 de quem não quer Turso.

---

## 🏅 FASE 3 — Migração ENTRE bancos pela UI (o superpoder) ✅ ENTREGUE 11/jun/2026

> "A pessoa escolhe onde deixar os dados" só é verdade se ela puder **mudar de
> ideia depois** sem dor.

1. Card em Configurações → Dados & Sistema: **"Mudar de banco"** — wizard de 3
   passos: (a) conectar destino + `ensureSchema`, (b) copiar dados, (c) trocar o
   perfil + `reconnectPrisma()` (já existe!).
2. Motor de cópia: **via Prisma, não via SQL** — `findMany` no client de origem →
   `createMany` no destino, model a model em ordem pai→filho (a ordem inversa do
   `deleteModuleData` já mapeada). Funciona entre QUALQUER par de dialetos —
   é o `mergeSqliteIntoTurso` generalizado (aquele é `sqlite_master`-only).
3. Relatório pós-migração (contagem por model origem×destino) + banco antigo
   fica INTACTO (mesma filosofia do modo réplica: origem nunca é apagada).
4. Fallback sempre disponível: export JSON completo → setup novo → import
   (por isso a Fase 0.3 é pré-requisito).

**Esforço:** médio. **Impacto:** enorme em confiança — destrava a adoção de
qualquer banco novo ("posso testar e voltar").

---

## FASE 4 — MySQL / MariaDB

Mesma receita da Fase 1 com outro dialeto:

1. `prisma/schema.mysql.prisma` + client + `baseline.mysql.sql` via `migrate diff`.
2. Adapter: `@prisma/adapter-mariadb` (Prisma 6.x) — mais um motivo p/ a decisão
   de upgrade na Fase 0.5.
3. Pegadinhas de dialeto: `TEXT` vs `VARCHAR(191)` (índices de email/unique),
   collation utf8mb4, `Boolean` como TINYINT.
4. Card no wizard + probe + friendlyError + docker compose no smoke test.

**Esforço:** médio (a arquitetura já existe). **Impacto:** médio — cobre
PlanetScale e hospedagens baratas (Hostinger etc., comuns no Brasil).

---

## FASE 5 — MongoDB (avaliação honesta: o mais caro, decidir se vale)

Mongo NÃO é "mais um dialeto" — é outro paradigma no Prisma:

- `provider = "mongodb"` exige schema próprio de verdade: ids `@db.ObjectId`
  (ou manter `String @id` com `@map("_id")`), **sem** `migrate diff`/baseline
  (schemaless; índices via `db push`), e **transações exigem replica set**
  (Atlas ok; Mongo local solto, não).
- Não existe driver adapter — conexão direta por URL, o que conflita com o
  modelo "URL resolvida em runtime" (resolvível: client gerado próprio +
  `datasources` override, como o ramo local já faz).
- `ensureSchema` vira "ensure indexes"; o motor de migração da Fase 3 funciona
  (é Prisma puro) — esse é o caminho de entrada de dados, não SQL.

**Recomendação:** manter o card "Em breve" até as Fases 1–4 estarem estáveis e
houver demanda real. Se o objetivo for só "deixar os dados num lugar meu",
Postgres self-hosted (Fase 1) já atende com 20% do esforço.

**Esforço:** muito alto. **Impacto:** baixo-médio (nicho).

---

## 🔐 Segurança & Segredos (não dá pra deixar pra depois)

1. **Mascarar credenciais em TODO log/erro** — `lib/prisma.ts` loga a assinatura
   do perfil (`cloud:turso:URL`) e `friendlyError` repete trechos da conexão.
   Com Postgres a senha vem DENTRO da URL (`postgres://user:senha@host`).
   Criar `maskDbUrl()` em `lib/db-config.ts` e usar em todo console/toast/erro.
   Hoje não vaza nada porque o token Turso é campo separado — com URL única vaza.
2. **`life-os-config.json` guarda segredos em texto puro** (authToken hoje;
   senha de Postgres amanhã). No desktop, cifrar os campos sensíveis do perfil
   com a `ENCRYPTION_KEY` local (o `lib/crypto.ts` com keyring já existe — reusar).
   Migração suave: ler texto puro legado, regravar cifrado.
3. **SSL por padrão**: Postgres/MySQL em nuvem exigem `sslmode=require`. O wizard
   deve ADICIONAR se faltar (e avisar), não falhar com erro críptico. Self-hosted
   em rede local pode desligar — com aviso explícito de tráfego em claro.
4. **Usuário de banco de menor privilégio** (docs): o Life OS precisa de
   DDL (ensureSchema) + DML, mas não de SUPERUSER/replication. Documentar o
   `CREATE ROLE` recomendado por provedor em `docs/DATABASE.md`.
5. **Supabase: avisar sobre a service key vs senha do banco** — conectamos via
   Postgres direto (senha do banco), NUNCA pedir a `service_role` key da API.
   Validação no estilo `assertValidCloudProfile()`: se o campo recebeu um JWT
   (`eyJ…`), a pessoa colou a key errada — é a PEGADINHA #1 do Turso reencarnada.
6. **Nota de RLS (Supabase)**: o Prisma conecta como owner e IGNORA Row Level
   Security — o isolamento multi-usuário do Life OS é por `userId` no app
   (regra do CLAUDE.md), não no banco. Documentar p/ ninguém achar que RLS
   protege algo aqui, nem se assustar com o aviso do painel do Supabase.

---

## 🛟 Resiliência & modos de falha (o que acontece quando o banco cai?)

Hoje, banco fora do ar = erro genérico em cada página. Com banco remoto isso
vira rotina (wifi caiu, free tier hibernou, token expirou):

1. ✅ **Health check central** *(11/jun/2026, completo)*: `GET /api/health` (com
   1 retry de backoff) + indicador na sidebar + **banner global de queda**
   (`components/layout/db-down-banner.tsx`, alimentado pelo MESMO poller via
   store compartilhado `use-db-health.ts` — "Tentar agora" incluso).
2. ✅ **Erros do Prisma traduzidos em runtime** *(11/jun/2026)*: `lib/db-errors.ts`
   (`friendlyDbError`) — o setup importa de lá; cobre P1001, P2021, quota/disco
   cheio, e tudo que o friendlyError do setup já cobria por provedor.
3. ✅ **Cold start de free tier** *(11/jun/2026)*: `withDbRetry()` em
   `lib/db-errors.ts` (1 retry + backoff em erro transitório; auth/SQL não
   re-tentam). Aplicado no /api/health; disponível p/ qualquer Server Action.
4. ✅ **Modo somente-leitura de emergência** *(11/jun/2026, 2ª rodada)*:
   `/api/health` agora faz um **write-probe com throttle** (1 escrita real a
   cada 5 min, em tabela própria `lifeos_write_probe`) e expõe `writable`;
   quando a leitura funciona mas a escrita falha, o banner global fica ÂMBAR
   com "disco cheio ou limite do plano grátis" em vez do vermelho genérico.
5. ✅ **Timeout por perfil** *(11/jun/2026)*: pool do Postgres falha rápido em
   serverless (5s) e tolera mais no desktop (10s). O client web do libSQL não
   expõe knob de timeout (limitação do driver).
6. ✅ **Watchdog do replica sync** *(11/jun/2026)*: `lastSyncAt`/`lastSyncError`
   no `/api/health`, no indicador da sidebar E no `DbSyncCard` (Configurações).
   Limitação que fica: o pull automático de 60s do libSQL não dá callback do
   timer — o watchdog enxerga os syncs manuais/forçados.

---

## 💾 Backup & Disaster Recovery por provedor

O sistema de snapshots atual é local-only (copia o arquivo .db). Cada provedor
precisa de uma resposta para "como eu volto atrás?":

| Provedor | Backup nativo | O que o Life OS oferece |
|---|---|---|
| Local/Híbrido | cópia de arquivo (já existe) | Snapshots + export JSON |
| Turso | branching/PITR (pago) | **Export JSON agendado** (ver item 2) |
| Supabase | backups diários (free: 1 dia) | Export JSON agendado + docs do painel |
| Postgres self-host | pg_dump (responsabilidade do usuário) | Export JSON agendado + docs |
| MySQL | mysqldump idem | idem |

1. **Export JSON é o backup universal** — mais um motivo p/ a Fase 0.3 ser a
   primeira coisa. Formato versionado (`{ schemaVersion, exportedAt, data }`)
   p/ o import de amanhã ler o export de hoje.
2. **Backup automático agendado** (a feature que falta): job leve no servidor
   (no desktop, no boot ou 1×/dia) que gera o JSON e guarda N cópias rotativas
   numa pasta escolhida (Drive/Dropbox sincronizam de graça). Card em
   Configurações: "Backups automáticos: ativado · diário · últimas 7 cópias".
3. **Restore testável**: botão "Validar backup" que lê o JSON e confere
   contagens SEM importar (dry-run do `importJsonData`). Backup que nunca foi
   testado não é backup.
4. **Antes de TODA migração entre bancos (Fase 3): export automático forçado.**
   Sem opt-out. É a rede de segurança da feature.

---

## ⚡ Performance & concorrência (a troca de banco muda a física)

1. 🟡 **Latência por query muda de ~0ms (arquivo) p/ 20–150ms (nuvem)** —
   *(11/jun/2026, 3ª rodada)*: o pior caso era a própria página de
   Configurações (~8 awaits sequenciais independentes) — agora é UM lote
   `Promise.all`. As demais páginas pesadas (dashboard, agenda, IA) já usavam
   `Promise.all` por construção. Fica de hábito: página nova com 3+ queries
   independentes nasce em lote.
2. **Pooling**: serverless (Vercel) com `pg` precisa de pool mínimo (max: 1)
   ou Supavisor; desktop pode pool normal (max: 5). O `buildAdapterClient`
   decide pelo ambiente (`isEphemeralServerless()` já existe).
3. ✅ **Concorrência: read-modify-write auditado** *(11/jun/2026, 2ª rodada)*:
   o hotspot real era `Account.balance` (lido e reescrito em 6 arquivos —
   transaction, business, trash, wishlist, recurring-payment, import-statement).
   Todos viraram `{ increment }`/`{ decrement }` atômicos. Gamificação/XP e
   streaks já eram DERIVADOS na leitura (groupBy de HabitLog) — sem estado
   armazenado, nada a corrigir.
4. **Índices**: o baseline tem os índices calibrados p/ SQLite; conferir no
   `migrate diff` que todos sobrevivem nos dialetos derivados (MySQL tem limite
   de tamanho de chave em utf8mb4 — índice em `String` longo quebra).
5. 🟡 **Medição de peso dialeto-aware** *(parcial, 11/jun/2026)*: o tamanho
   TOTAL do banco agora é medido pelo dialeto certo (`measureDbSize` em
   storage.ts: fs / `pg_database_size` / PRAGMA) — alimenta o card "Seu banco"
   e o aviso de cota. O breakdown POR CATEGORIA do `getStorageStats` ainda
   carrega linhas; otimizar se a nuvem paga por leitura virar realidade.

---

## 🧨 Catálogo de pegadinhas de dialeto (checklist vivo — conferir a cada fase)

> Cada item já mordeu alguém em algum projeto. Conferir 1 a 1 no smoke test.

- ✅ **Case sensitivity** *(11/jun/2026, 2ª rodada)*: helper
  `containsInsensitive(q)` em `lib/db-text.ts` (adiciona `mode: "insensitive"`
  só no Postgres; cast do tipo canônico em UM lugar). Aplicado em TODAS as
  buscas de usuário: entity-search (relacionar com…), busca da IA (orContains
  + STUDIES), transações, tarefas do projeto e advogado do diabo. Os `contains`
  de marcadores exatos (URLs internas, `data:image`) ficam case-sensitive de
  propósito. Login por email segue case-sensitive (decisão antiga).
- ✅ **Ordenação com NULL** *(11/jun/2026, 3ª rodada)*: `nulls: "last"`
  explícito nos 5 pontos onde tarefas SEM prazo entram no resultado (briefing,
  contexto da IA, listagem da IA, board por "Prazo próximo" e pendentes da
  agenda — este último tinha um bug latente: `take: 50` com NULLs primeiro
  podia esconder tarefas datadas). Queries com filtro de range de data não
  veem NULLs e ficaram como estavam; `Invoice.dueDate` é obrigatório.
- **`Boolean` em SQLite é 0/1, no Postgres é boolean real** — qualquer raw SQL
  ou comparação textual quebra.
- **`DateTime`**: SQLite guarda texto/epoch (o bug do `typeof createdAt` do
  sync), Postgres tem `timestamptz`. Conferir round-trip de timezone no smoke
  (criar evento 23h em UTC-3 → ler → mesma hora).
- **`Decimal`**: vira `numeric` no Postgres (precisão real). Valores que o
  SQLite arredondou silenciosamente passam a divergir em comparações `===`.
- **Autoincrement**: ids são `uuid()` (👍 portável), mas conferir se NENHUM
  model usa `@default(autoincrement())` — no Mongo não existe.
- **Tamanho de linha/índice no MySQL**: `String` vira `VARCHAR(191)` por
  padrão histórico; campos longos (notas, JSON em texto) precisam `@db.Text`
  — que por sua vez não pode ter `@unique` simples no MySQL.
- **`createMany` + `skipDuplicates`**: não existe no SQLite... existe no
  Postgres/MySQL e NÃO existe no Mongo. O motor de migração (Fase 3) não pode
  depender dele cegamente.
- **Transações interativas**: o limite do libSQL (DateTime em `$transaction`)
  não existe no Postgres — mas o timeout default de 5s do Prisma derruba
  migrações grandes; configurar `timeout` no `$transaction` do motor da Fase 3.
- **`PRAGMA` não existe fora do SQLite** — qualquer chamada fora do gate de
  dialeto explode com erro de sintaxe (os 4 arquivos da auditoria da Fase 0.2).

---

## 🚀 Oportunidades que os bancos novos DESTRAVAM (não só paridade)

Suportar Postgres não é só "mais uma opção" — destrava features que o SQLite
não consegue, conectando com o `IA_ROADMAP.md`:

1. **pgvector (Supabase/Neon têm de graça)** → a busca semântica/RAG do
   Tier 1 da IA deixa de ser "cosseno em memória" e vira busca vetorial de
   verdade. O `Embedding` model ganharia coluna nativa no schema derivado.
2. **Full-text search nativo** (`tsvector` no Postgres, FTS no MySQL) → busca
   global do app ("aquele gasto do carro") sem embeddings, de graça.
3. **`Json` nativo (jsonb)**: WorkoutPlan, Portfolio.data e cia. hoje são JSON
   em `String`. No schema derivado podem virar `Json` — consultável e indexável.
   (Cuidado: manter `String` no canônico SQLite; o derivador faz o upgrade.)
4. **Listen/Notify (Postgres)** → sync quase-tempo-real entre devices sem
   polling de 60s (futuro distante, mas é o caminho p/ colaboração).
5. **Acesso de ferramentas externas**: dados no Supabase = painel SQL, gráficos
   no Metabase/Grafana, MCP do Supabase no Claude... o dado deixa de ser cativo.
   Alinha com a filosofia: o dono dos dados é o usuário.

---

## 🧭 Horizonte de provedores (avaliar depois das fases principais)

| Provedor | O que é | Custo de entrada pós-Fase 1 |
|---|---|---|
| **Neon** | Postgres serverless c/ branching, free tier bom | ~Zero (é Postgres; só detecção de URL + docs do cold start) |
| **Railway/Render** | Postgres gerenciado simples | Zero (Postgres genérico) |
| **PGlite** | Postgres EMBARCADO em WASM (arquivo local!) | Médio — substituiria SQLite local mantendo 1 dialeto só. Observar maturidade; hoje não tem adapter Prisma estável |
| **Cloudflare D1** | SQLite na edge | Baixo (adapter `@prisma/adapter-d1` existe; mas só faz sentido se houver deploy em Workers) |
| **CockroachDB** | Postgres-compatível distribuído | Baixo (dialeto postgres com ressalvas) |
| **FerretDB** | "Mongo" sobre Postgres | Se a demanda por Mongo for só a API, atalho p/ matar a Fase 5 |

**PGlite merece atenção especial**: se amadurecer, o Life OS poderia convergir
p/ UM dialeto (Postgres) em todos os modos — local, réplica e nuvem — e o
multi-schema da Fase 0 viraria desnecessário. Não apostar agora; reavaliar a
cada 6 meses.

---

## 🩺 UX de status do banco (a pessoa precisa VER onde os dados estão)

1. ✅ **Card "Seu banco"** *(11/jun/2026)*: `db-overview-card.tsx` em
   Configurações → Dados & Sistema — provedor + ícone, endereço mascarado,
   latência medida, tamanho do arquivo, último sync, último backup.
2. ✅ **Indicador discreto no layout** + **banner global de queda** *(11/jun/2026)*.
3. ✅ **Wizard: teste de conexão** *(11/jun/2026, 3ª rodada)*: botão "Testar
   conexão" no painel Postgres/Supabase do wizard (`testPostgresSetupConnection`
   — funciona pré-instalação; com sistema instalado exige login) com erros
   traduzidos pelo `friendlyDbError`. O diagnóstico em camadas completo
   (DNS→TCP→auth→schema→escrita) segue nos CLIs `db:probe*`.
4. ✅ **Avisos de limite proativos** *(11/jun/2026, 2ª rodada)*: o card "Seu
   banco" mede o tamanho pelo dialeto certo (arquivo via fs, Postgres via
   `pg_database_size`, Turso via PRAGMA best-effort) e, quando o provedor tem
   cota grátis conhecida (Turso 5 GB, Supabase 500 MB), mostra a barra de uso
   com aviso a partir de 80% apontando para o "Mudar de banco".

---

## ✅ Definition of Done por provedor (o checklist anti-"passou batido")

Um provedor só vira `available: true` no wizard quando TODOS passarem:

- [ ] Setup do zero pelo wizard → cria admin → dashboard abre sem erro
- [ ] `ensureSchema` idempotente (rodar 2× sem erro) + reconcílio aditivo testado
- [ ] Smoke CRUD nos módulos críticos (finanças c/ Decimal, agenda c/ DateTime,
      notas c/ texto longo, treino c/ JSON-string)
- [ ] Round-trip de timezone e de Decimal verificados
- [ ] Export JSON completo → import num banco VAZIO do mesmo provedor → contagens iguais
- [ ] Migração Fase 3: SQLite local → provedor → de volta (ida e volta sem perda)
- [ ] Busca de texto com acento/caixa se comporta igual (helper de dialeto)
- [ ] Erros comuns traduzidos no `friendlyError` (auth, SSL, unreachable, quota)
- [ ] `db:probe` cobre o provedor
- [ ] Guards de capacidade na UI (vacuum/snapshot/réplica escondidos se não suportar)
- [ ] Seção no `docs/DATABASE.md` com passo a passo de criação da conta grátis
- [ ] `tsc --noEmit` + `npm run lint` + `next build` limpos com o client derivado

---

## 🔁 Transversal (acompanha todas as fases)

- 🟡 **Matriz de teste**: `npm run db:smoke:postgres` *(11/jun/2026)* roda
  baseline→CRUD→round-trips num Postgres de docker; `docker-compose.db.yml`
  na raiz sobe o banco descartável (`docker compose -f docker-compose.db.yml
  up -d postgres`). Generalizar p/ outros provedores quando a Fase 4 destravar.
- **`docs/DATABASE.md`**: uma seção por provedor (como conectar, limites, o que
  cada modo suporta — réplica é libSQL-only, VACUUM é local-only...).
- **Tabela de capacidades por provedor** na UI (o card do wizard já tem
  `desktopOnly`; ganhar `capabilities: { replica, vacuum, snapshot, ... }`).
- **`npm run db:probe` generalizado** por provider — o diagnóstico pré-deploy
  que salvou o deploy do Turso vale p/ todos.
- **Regra de ouro do schema**: toda mudança de model passa a ter 3 artefatos
  andando juntos: `schema.prisma` (canônico) → schemas derivados → baselines.
  Automatizar num único `npm run db:baseline` expandido p/ não driftar
  (a lição das migrations reconciliadas).

---

## 📊 Resumo executivo (ordem recomendada)

| Fase | O quê | Status |
|---|---|---|
| 0 | Fundações (DbProfile, dialect gates, JSON 100%, multi-schema) | ✅ 11/jun/2026 |
| 1 | PostgreSQL genérico (+ smoke test com banco vivo) | ✅ 11/jun/2026 |
| 2 | Supabase first-class (pooler, wizard passo a passo, detecção) | ✅ 11/jun/2026 |
| 3 | Migração entre bancos pela UI | ✅ 11/jun/2026 |
| 4 | MySQL/MariaDB | ⏸ Bloqueada: exige Prisma 6.x (decisão 0.5) |
| 5 | MongoDB | ⏸ Só com demanda real |

Blocos transversais que acompanham todas as fases: **Segurança & Segredos**
(mascarar URLs, cifrar config), **Resiliência** (health check, free tier
hibernando), **Backup/DR** (export JSON agendado), **Performance** (latência
de nuvem, pooling, concorrência), **Catálogo de pegadinhas de dialeto**
(case sensitivity, NULLs, Decimal...), **Definition of Done por provedor**.

**Começar por:** ~~Fase 0.3 (export/import JSON 100%)~~ ✅ **ENTREGUE em
11/jun/2026** — `lib/full-backup.ts`: formato v3 versionado (schemaVersion 3),
IDs preservados, FKs validadas/remapeadas na importação, wipe filho→pai
reutilizado pelo factory reset (que antes esquecia ~15 models), dry-run
"Validar Backup" na UI e backup automático diário.

---

## ✅ FASE 0 + FASE 1 ENTREGUES (11/jun/2026)

**Fase 0 (fundações):**
- 0.1 `DbProfile` multi-provider: `CloudProvider = turso|postgres|supabase|mysql|mongodb`
  (lib/db-config.ts); `getEnvProfile` reconhece `postgres://`, `mysql://`, `mongodb+srv://`
  em `DATABASE_URL`; `detectProviderFromUrl` detecta Supabase pelo host.
- 0.2 Gates de dialeto: `lib/db-dialect.ts` (`getDialect`, `isSqliteFamily`,
  `usesLibsqlAdapter`); db-bootstrap dialect-aware, db-migrate marcado como
  SQLite→libSQL-only, maintenance (VACUUM/integrity) gated.
- 0.4 Workarounds do libSQL centralizados no gate `usesLibsqlAdapter()` (são bugs
  do ADAPTER, não vão junto pro Postgres).
- 0.5 Decisão de upgrade: **ficar no Prisma 5.22** + `@prisma/adapter-pg@5.22`
  (combo da réplica calibrado a mão); 6.x adiado até re-teste da réplica.

**Fase 1 (PostgreSQL genérico — cobre Supabase/Neon/Railway/RDS/self-host):**
- Deps `@prisma/adapter-pg@5.22` + `pg@8`; `scripts/derive-schemas.mjs` →
  `prisma/schema.postgres.prisma` (client gerado em `node_modules/@lifeos/client-postgres`,
  carregado em runtime via serverExternalPackages, igual ao libsql nativo);
  `prisma/baseline.postgres.sql`; scripts npm `db:derive`, `db:generate:all`,
  `db:baseline:postgres`, `db:baseline:all` (postinstall gera os 2 clients).
- `ensureSchema(client, dialect)`: baseline por dialeto + reconcílio aditivo via
  `information_schema` no Postgres (PRAGMA segue só na família SQLite).
- `buildAdapterClient`: ramo postgres/supabase (Pool max 1 em serverless / 5 desktop,
  SSL automático fora de localhost); mysql/mongodb recusam com erro claro.
- Wizard: cards PostgreSQL e Supabase `available: true`, painel de connection string
  (recusa service_role key `eyJ…`, orienta pooler 6543 no Supabase, mascara senha na
  revisão); `setup.ts` adiciona `sslmode=require` em host remoto.
- `friendlyError` p/ Postgres (senha, DNS, porta/pooler, SSL, banco inexistente,
  free tier hibernando) + `npm run db:probe:postgres` (diagnóstico em camadas
  DNS→TCP/auth/SSL→query→schema→escrita).
- Segurança §1–2 (entraram junto, como planejado): `maskDbUrl()` em todos os
  logs/erros (assinatura do prisma.ts mascarada) e **config cifrado** —
  authToken/URL-com-senha do `life-os-config.json` cifrados com a ENCRYPTION_KEY
  (keyring de lib/crypto.ts), texto puro legado lido e regravado cifrado.
- Docs: seção "PostgreSQL / Supabase" em `docs/DATABASE.md` (RLS, pooler, env vars,
  menor privilégio, pegadinhas de dialeto).

~~**Pendência honesta da Fase 1:** o smoke test com um Postgres VIVO ainda não
rodou.~~ ✅ **RODOU em 11/jun/2026**: `npm run db:smoke:postgres` contra um
`postgres:16-alpine` no Docker — baseline aplicado, CRUD com o client derivado,
round-trips EXATOS de Decimal (123.45), DateTime com fuso (23h UTC-3) e texto
longo/JSON-string de 195 KB, limpeza por cascade. `db:probe:postgres` em camadas
também passou. Réplica continua libSQL-only (decisão de escopo).

---

## ✅ FASE 2 + FASE 3 ENTREGUES (11/jun/2026)

**Fase 2 (Supabase first-class):** detecção por host, pooler/SSL e recusa de
service_role key já tinham vindo com a Fase 1; agora o wizard tem o **passo a
passo numerado** (criar projeto → Connect → URI direta 5432 vs pooler 6543 →
trocar [YOUR-PASSWORD]) direto no painel. Screenshots ficam para os docs se
houver demanda — o texto cobre o fluxo inteiro.

**Fase 3 (migração entre bancos pela UI — o superpoder):**
- **Motor**: `lib/db-copy.ts` (`copyDatabase`) — instância INTEIRA via Prisma
  (todos os usuários/models), funciona entre qualquer par de dialetos. Ordem
  pai→filho vem de `COPY_MODEL_ORDER` (lib/full-backup.ts), DERIVADA do registro
  do backup v3 — um lugar só para manter em dia. Lotes de 100 com fallback
  linha-a-linha (sem depender de `skipDuplicates`), hierarquias (parentId) em
  2 passos, origem NUNCA escrita.
- **Actions**: `settings/actions/migrate-db.ts` — `testMigrationTarget` (conecta
  + ensureSchema por dialeto + avisa se o destino não está vazio) e
  `migrateToTarget` (backup JSON forçado de TODOS os usuários + snapshot do .db
  em `backups/pre-migration/` SEM opt-out → cópia → `setDbProfile` +
  `reconnectPrisma`). Falhou? O perfil atual não muda.
- **UI**: card "Mudar de banco" (`migrate-db-card.tsx`) em Configurações →
  Migração de Dados — destino Turso / Postgres-Supabase / arquivo local, teste,
  confirmação em 2 cliques e relatório por model (copiados/pulados).
- **Card "Seu banco"** (UX de status §1): `db-overview-card.tsx` — provedor,
  endereço mascarado, latência medida, tamanho do arquivo, último sync, último
  backup. Substituiu o bloco fixo "Conectado à Nuvem (Turso)" (que mentiria com
  Postgres).

**Próximos:** Fase 4 (MySQL) está **bloqueada pela decisão 0.5**: o adapter
`@prisma/adapter-mariadb` é do Prisma 6.x e estamos pinados no 5.22 pelo combo
calibrado da réplica — subir o Prisma (re-testando réplica/sync) é o
pré-requisito real. Fase 5 (Mongo) segue "Em breve" até demanda real.
