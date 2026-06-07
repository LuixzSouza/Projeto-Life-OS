# Plano: Conexão de banco por usuário + Multi-provedor (Supabase, Postgres, etc.)

> Documento de planejamento. Lê-se de cima pra baixo: primeiro entender o modelo
> atual, depois os caminhos possíveis e as fases de execução.

---

## 1. Como funciona HOJE (a verdade do código)

A conexão é resolvida **por instância (processo)**, não por usuário:

- `lib/db-config.ts` → `getDbProfile()` devolve **UM** perfil de banco para o app
  todo. Prioridade: variáveis de ambiente (`TURSO_*`, usado no deploy Vercel) >
  arquivo `life-os-config.json` (desktop/local).
- `lib/prisma.ts` → mantém **um** `PrismaClient` global (Proxy reconectável) para
  esse perfil. Todas as queries do app usam esse mesmo banco.
- Multiusuário hoje = **um banco compartilhado**, com os dados isolados por
  `userId` (toda query escopa por `userId`). Ver o cadastro multiusuário em `app/auth-actions.ts`.

### Consequência prática (responde "Turso dela ou o meu?")

| Cenário de deploy | Quem usa qual banco |
|---|---|
| **Desktop** (cada pessoa roda o próprio app) | Cada um configura o **seu** banco no `/setup`. Naturalmente isolado — são instâncias diferentes. ✅ "cada um com o seu" |
| **Nuvem** (1 instância na Vercel, compartilhada) | **Todos usam o SEU Turso.** O amigo se cadastra e os dados dele ficam no SEU banco (isolados por `userId`, mas é seu quota/seu arquivo). ❌ não é o Turso dele |

**Por que isso importa pra você:** se o objetivo é "o amigo conecta no Turso DELE",
no modelo de nuvem atual isso **não acontece** — ele entraria no seu. Há dois jeitos
de conseguir "cada um com o seu", descritos abaixo.

---

## 2. Os dois modelos possíveis

### Modelo A — Cada pessoa roda a própria instância (recomendado p/ começar)
Cada um instala/deploya o Life OS e aponta para o **próprio** banco no `/setup`.
- ✅ Zero mudança de arquitetura — **já funciona hoje**.
- ✅ Privacidade real: o dado do amigo nunca toca o seu banco.
- ✅ Cada um escolhe local, Turso próprio, etc.
- ❌ O amigo precisa rodar o app (desktop) ou fazer o próprio deploy.

**É a filosofia local-first do projeto.** Para "passar pra um amigo testar", o ideal
é ele rodar o launcher desktop ou um deploy próprio e usar o Turso dele.

### Modelo B — Uma instância, cada usuário com SEU banco ("traga seu banco")
Uma única instância na nuvem onde **cada usuário logado conecta ao próprio banco**.
- ✅ Um link só; o amigo entra e pluga o Turso/Supabase dele.
- ❌ Mudança **grande** de arquitetura (detalhada na Fase 2).
- ⚠️ Problema do ovo-galinha: para validar o login preciso de um banco ANTES de
  saber qual é o banco do usuário → exige um **banco "diretório" central**.

---

## 3. Restrição técnica crítica do multi-provedor (ler antes de sonhar alto)

O Prisma **fixa o `provider` no schema** (`prisma/schema.prisma` → `provider = "sqlite"`),
em tempo de build. Isso **não** é trocável em runtime. Por isso:

- **SQLite ↔ Turso/libSQL**: MESMO provider (`sqlite`). Por isso o Híbrido/nuvem
  funciona hoje com um schema só + driver adapter. ✅
- **Postgres / Supabase / MySQL**: provider DIFERENTE. **Não dá** para apontar o
  mesmo client gerado para eles. Precisa de uma destas saídas:
  1. **Múltiplos schemas + clients gerados** (ex.: `schema.sqlite.prisma` e
     `schema.postgres.prisma`), escolhendo o client em runtime. Custo: manter o
     schema em dobro, migrations em dobro.
  2. **Postgres como padrão na nuvem** e SQLite/Turso só no local — dois clients,
     porém com papéis claros.
  3. **Trocar a camada de dados por uma agnóstica** (Drizzle/Kysely com múltiplos
     dialetos). Custo: reescrever a camada de acesso a dados (grande, mas é o único
     caminho "n provedores de verdade").
- **MongoDB**: modelo NÃO relacional. Fora de escopo sem repensar o data model.

**Resumo honesto:** "Turso próprio" é barato (mesmo provider). "Supabase/Postgres"
é um projeto de verdade. MongoDB é outra história.

---

## 4. Plano por fases

### Fase 1 — Esclarecer e habilitar o Modelo A (curto prazo, baixo risco)
Objetivo: deixar "cada um com o seu" óbvio e funcional, sem rearquitetar.
- [x] **Travar o cadastro aberto** ✅ — política de instância `registrationOpen`
      (`lib/db-config.ts`: `isRegistrationOpen`/`setRegistrationOpen`; env
      `LIFEOS_REGISTRATION=off|on` tem prioridade p/ serverless). `register` recusa
      quando fechado. Toggle "Permitir novos cadastros" em Configurações → Segurança
      (cartão "Acesso ao Sistema") via `setRegistrationPolicy`.
- [x] **Texto no `/setup` e `/register`** ✅ — nota de instância no `/register`
      (`components/login/RegisterPageClient.tsx`, com link p/ o guia) e no passo de
      revisão do `/setup` (`components/setup/steps/step-review.tsx`): deixa claro que os
      dados vão para o banco DESTA instância e, se compartilhada, para o banco do dono.
- [x] **Guia self-hosting** ✅ — `docs/SELF_HOSTING.md`: Desktop (banco `local`) e Deploy
      próprio (Vercel + Turso do usuário), env vars, `LIFEOS_REGISTRATION`, e ponteiro
      para `docs/DATABASE.md`.

### Fase 2 — Conexão por usuário numa instância (Modelo B) — MÉDIO/ALTO esforço
Objetivo: cada usuário logado usa o próprio banco, numa instância só.

Arquitetura necessária:
- [ ] **Banco diretório (control plane)**: um banco central pequeno que guarda
      `User` (email, hash de senha) + o **DbProfile de cada usuário** (modo, url,
      token). **Segredos com envelope encryption** (`lib/crypto.ts`): a chave-mestra
      vive **só em env/KMS, nunca em disco nem no próprio banco** (ver Ponto Cego #4).
- [ ] **Resolução por sessão**: `getDbProfile()` deixa de ser global. Passa a
      resolver pelo `userId` da sessão (lê o DbProfile do diretório).
- [ ] **Client por usuário + serverless**: cache `globalThis` por
      `(userId, assinatura)` só ajuda em *warm starts* — **não é a estratégia**
      (ver Ponto Cego #1). Em serverless, a gestão de conexão real é do lado do banco:
      Turso/libSQL é HTTP (tolera bem); **Postgres/Supabase EXIGE pooler**
      (Prisma Accelerate / PgBouncer / driver serverless). **`$disconnect()` explícito
      ao fim de cada request** (ver Ponto Cego + Sugestão de desconexão agressiva).
- [ ] **Provisionamento ASSÍNCRONO (não em runtime de request)**: `ensureSchema` NÃO
      roda no fluxo da 1ª query. Dispara no **clique "Conectar/Salvar" do onboarding**,
      com tela "Configurando seu banco…", protegido por **lock/idempotência** (flag
      `provisioned` no diretório) p/ evitar corrida de 2 abas (ver Ponto Cego #3).
- [ ] **Onboarding**: no `/register`, depois de criar a conta no diretório, um passo
      "conecte seu banco" (reusa os cards de provedor do `/setup`) → provisiona →
      só então libera o app.
- [ ] Riscos: complexidade alta; o banco diretório vira **ponto único de ataque**;
      você passa a ser **custodiante de credenciais de terceiros**. Avaliar
      seriamente se vale vs. Modelo A (que evita custódia por completo).

### Fase 3 — Multi-provedor relacional (Supabase/Postgres → depois MySQL)
Objetivo: além de SQLite/Turso, aceitar Postgres (Supabase é Postgres gerenciado).

> **PORTÃO DE DECISÃO (antes de tocar código):** multi-provedor é compromisso
> firmado de longo prazo? **Se SIM → avaliar trocar o ORM (Drizzle/Kysely) ANTES da
> Fase 2.** Drizzle resolve múltiplos dialetos em runtime, **sem engines pesadas**
> (resolve o Ponto Cego #2). Custo: reescrever a camada de dados (todas as actions
> usam Prisma) — mais barato AGORA do que depois de empilhar 2 schemas Prisma. **Se
> for incerto → ficar no Prisma + Modelo A** e não pagar o custo da reescrita à toa.

Caminho via **Prisma (2 clients)** — só se NÃO trocar de ORM:
- [ ] **Peso do bundle (Ponto Cego #2):** 2 clients Prisma = 2 engines/WASM no bundle.
      Risco de estourar o limite da Vercel (50MB zip / 250MB) e piorar cold start.
      Mitigar com driver adapters (já habilitado) e o client sem engine quando possível.
- [ ] Gerar um segundo schema/generator `postgres` espelhando os models.
- [ ] `buildAdapterClient` (em `lib/prisma.ts`) escolhe o client por
      `profile.provider` (`sqlite` | `turso` | `postgres`).
- [ ] `baseline.sql`/migrations por provider (o `ensureSchema` hoje é SQLite-only —
      precisaria de um baseline Postgres).
- [ ] Ativar os cards `postgres`/`supabase` no wizard (`components/setup/wizard-types.ts`
      hoje `available: false`).
- [ ] Validar tipos divergentes: `Decimal`, `DateTime`, enums (SQLite não tem enum
      nativo; Postgres tem) — alinhar o schema.

### Fase 4 — Polimento e bordas
- [ ] Migração de dados entre provedores (export/import já existe p/ JSON; estender).
- [ ] Testes de conexão por provedor (já há `testTursoConnection`; criar genérico).
- [ ] Métricas/limites: avisar o usuário sobre quota do plano grátis de cada provedor.

---

## 5. Pontos cegos de infraestrutura & segurança (serverless / Vercel)

> Riscos que afundam planos "traga seu banco" na prática. Ler ANTES de iniciar
> Fase 2 ou 3. Alguns já valem para o código atual.

### #1 — Cache de clients vs. ciclo de vida serverless
Funções da Vercel são **efêmeras e isoladas**: cold starts e escala horizontal
destroem o cache em memória; requests concorrentes caem em instâncias diferentes.
Instanciar `PrismaClient` por request gera overhead alto.
- **Mitigação:** cache `globalThis` ajuda só em *warm starts*. A gestão real é do
  banco: **Turso/libSQL = HTTP (tolera bem)**; **Postgres/Supabase = pooler
  obrigatório** (Prisma Accelerate / PgBouncer / driver serverless do Neon).

### #2 — Peso do bundle do Prisma (Fase 3)
Cada provider = engine binária/WASM própria. 2 clients (sqlite + postgres) = 2 engines
no bundle → risco de estourar o limite da Vercel (50MB zip / 250MB) e degradar cold start.
- **Mitigação:** driver adapters (já habilitado) + client sem engine; ou **trocar pra
  Drizzle/Kysely** (sem engine pesada) — ver Portão de Decisão na Fase 3.

### #3 — `ensureSchema` (DDL) em runtime de request — JÁ é dívida hoje
Rodar `CREATE TABLE`/checagem de coluna dentro de uma action HTTP é arriscado:
- **Timeout** (Hobby 10–15s) no meio do DDL → banco **meio-migrado**.
- **Concorrência:** 2 abas logo após registrar disparam `ensureSchema` no mesmo banco
  ao mesmo tempo → erro/trava.
- Hoje isso ocorre em `setup` e `migrateToReplica`. **Mitigação:** mover para
  **provisionamento explícito no clique** (tela "Configurando…") + **lock/flag de
  idempotência**; nunca no fluxo da 1ª query.

### #4 — Banco diretório = alvo de altíssimo valor (Modelo B)
O diretório guardaria **strings de conexão de bancos de terceiros** (Turso/Supabase).
Um vazamento expõe a infra de TODOS os usuários, não só a sua.
- **Mitigação:** **envelope encryption** com chave-mestra **só em env/KMS, nunca
  persistida em disco ou no banco**. Melhor ainda: **não custodiar** credenciais de
  terceiros — o que reforça o **Modelo A**.

---

## 6. Recomendação

1. **Agora:** adotar o **Modelo A** (Fase 1). É o que respeita a filosofia local-first
   e resolve "cada um com o seu" sem reescrever nada — o amigo roda a própria instância
   e usa o Turso dele. Custo quase zero. Os 4 Pontos Cegos reforçam essa escolha.
2. **Dívida imediata (independe das fases):** mover o `ensureSchema` de `setup`/
   `migrateToReplica` para um provisionamento explícito com lock (Ponto Cego #3), pois
   o risco de timeout/corrida já existe hoje na Vercel.
3. **Antes de pensar em Fase 2/3:** bater o martelo no **Portão de Decisão do ORM**.
   Se multi-provedor é certo → avaliar Drizzle/Kysely ANTES (evita Pontos Cegos #1/#2).
   Se incerto → Prisma + Modelo A.
4. **Se quiser instância compartilhada com bancos próprios:** Fase 2 é um épico
   dedicado (diretório + client por usuário + pooler + custódia de segredos). Maior
   pedaço do projeto; só com os Pontos Cegos #1 e #4 resolvidos.

---

## 7. Arquivos que serão tocados (mapa rápido)

- `lib/db-config.ts` — `DbProfile`, resolução do perfil (global → por usuário na Fase 2).
- `lib/prisma.ts` — `buildAdapterClient`, cache de clients (global → por usuário; +provider).
- `lib/db-bootstrap.ts` — `ensureSchema` (hoje SQLite; +baseline Postgres na Fase 3).
- `app/actions/setup.ts` + `components/setup/*` — wizard, cards de provedor, onboarding.
- `app/auth-actions.ts` — login/registro contra o banco diretório (Fase 2).
- `proxy.ts` — rotas públicas/sessão (provavelmente sem mudança).
- (Novo) camada do "banco diretório" — control plane da Fase 2.

---

## 8. Log de execução (o que já foi feito × o que falta)

### ✅ Feito
- **Fase 1 — Travar cadastro aberto** (política de instância): `registrationOpen` no
  config + env `LIFEOS_REGISTRATION`; `register` recusa quando fechado; toggle em
  Configurações → Segurança ("Acesso ao Sistema"). Type/lint limpos.
- **Fase 1 — copy de instância**: nota no `/register` (`RegisterPageClient.tsx`) e no
  passo de revisão do `/setup` (`step-review.tsx`) avisando que os dados vão para o banco
  DESTA instância (e, se compartilhada, para o do dono). Type/lint limpos.
- **Fase 1 — guia self-hosting**: `docs/SELF_HOSTING.md` (Desktop `local` + Deploy próprio
  Vercel/Turso, env vars, `LIFEOS_REGISTRATION`), linkado do `/register`.

### ⏳ Próximo (em ordem sugerida)
1. **Dívida #3 (independe de fase)**: tirar o `ensureSchema` (DDL) do fluxo de request
   em `setup`/`migrateToReplica` → provisionamento explícito no clique, com tela
   "Configurando…" e lock/flag de idempotência. Risco real de timeout na Vercel.
2. **Portão de Decisão do ORM** (antes de Fase 2/3): decidir Prisma vs Drizzle/Kysely
   se multi-provedor for compromisso firmado.

### 🧊 Depois (épicos)
- **Fase 2** — conexão por usuário (banco diretório + client por usuário + pooler +
  custódia cifrada de segredos). Só após resolver Pontos Cegos #1 e #4.
- **Fase 3** — multi-provedor relacional (Supabase/Postgres), conforme o Portão de
  Decisão do ORM. MongoDB fora de escopo.

> Convenção: ao concluir um item, marcar [x] na fase correspondente E mover a linha
> de "Próximo" para "Feito" aqui, com 1 frase do que mudou.
