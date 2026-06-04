# Life OS — Arquitetura do Banco de Dados

Banco **SQLite + Prisma** (provider `sqlite`, compatível com Turso/libSQL na nuvem via driver adapter).
Filosofia: **local-first, portável, multi-user e centralizado** — muitas tabelas conversando entre si.

> Ao mudar o schema: rode `npx prisma db push` (ou `migrate dev`) + `npx prisma generate`.
> No Windows, **pare o app** antes (lock da DLL do Prisma — ver `scripts/stop.mjs`).

---

## Convenções

- **IDs**: `uuid()` (maioria) ou `cuid()` (Task, Friend, MealPlan). Não misturar em modelos novos — preferir `uuid()`.
- **Multi-user**: todo dado de usuário tem `userId`. Hoje a maioria é `String?` (nullable, herança da
  migração incremental); alguns são obrigatórios (Settings, UserStats, Portfolio, Friend, WardrobeItem,
  Challenge, ChallengeCheckin, MealPlan, e todo o Módulo 12). **Toda relação `user` tem `onDelete: Cascade`** —
  apagar um usuário remove os dados dele de forma limpa.
- **Dinheiro**: sempre `Decimal` (nunca Float). Datas: `DateTime`.
- **Timestamps**: `createdAt @default(now())` e `updatedAt @updatedAt` na maioria — base para futura
  sincronização incremental (comparar `updatedAt`).
- **Índices**: toda FK muito consultada é indexada; há índices compostos para os padrões de query reais
  (ex.: `[userId, date]`, `[userId, startTime]`, `[userId, type, date]`, `[userId, nextReview]`).
  **Soft-delete:** como ~todo read filtra `where: { userId, deletedAt: null }` (81 ocorrências em 26 arquivos),
  os 12 modelos com coluna `deletedAt` têm índice composto liderado por `userId` que inclui `deletedAt`
  (`[userId, deletedAt]`; ou `[userId, deletedAt, date]` em Transaction e `[userId, deletedAt, startTime]` em
  Event, onde a query ainda ordena/filtra por data). Invoice tem `[userId, status, dueDate]` p/ `generateReminders`.
  **Regra:** ao indexar, lidere sempre por `userId` e ponha as colunas na ordem usada no `where`/`orderBy`.
- **Soft-delete**: modelos-chave têm `deletedAt DateTime?` (Task, Transaction, Project, StudyNote,
  SavedLink, MediaItem, Event, WishlistItem, Friend, Client, WardrobeItem). Queries devem filtrar
  `deletedAt: null` para implementar lixeira/restaurar.

---

## Mapa de relacionamentos (quem conversa com quem)

**Negócios → Finanças** (cadeia completa):
`Friend → Client → Billing → Invoice → Transaction → Account`
(`Client → Project → Task/Event/Meeting/JobApplication`)

**Estudos** (hierárquico e conectado):
`StudySubject (pai/filho) → StudyContent/StudySession/FlashcardDeck/LearningGoal`
`StudyNote → Subject | Content | Session` · `LearningGoal → LearningTask`
`FlashcardDeck → Flashcard` (repetição espaçada: box/easeFactor/interval/nextReview)

**Saúde**: `Workout`, `HealthMetric`, `BodyMeasurement`, `Meal`, `MealPlan`, `Challenge → ChallengeCheckin`

**Conteúdo/Sistema**: `ManagedSite → SitePage`, `AiChat → AiMessage`, `SavedLink`, `MediaItem`, `AccessItem`

---

## Módulo 12 — Tecido conectivo central (cross-módulo)

Estas tabelas existem para o sistema **escalar e se interligar** sem criar dezenas de FKs rígidas.
Usam referência **polimórfica** (`entityType` + `entityId`) para apontar para qualquer entidade.

| Tabela | Para quê | Como usar |
|---|---|---|
| **Tag** + **Taggable** | Vocabulário único de tags entre módulos | `Taggable(tagId, entityType:"task", entityId)`; filtre por tag cruzando módulos |
| **Category** | Categorias de finança com cor/ícone/`monthlyBudget` e subcategorias | `Transaction.categoryId` / `RecurringExpense.categoryId` (opcional, convive com o rótulo legado `category`) |
| **Notification** | Inbox central de lembretes | qualquer módulo cria `{type, title, dueAt, entityType, entityId, actionUrl}`; UI lê não-lidas (`readAt: null`) |
| **ActivityLog** | Auditoria / linha do tempo | logue `{action, module, entityType, entityId, summary, meta}` em cada mutação relevante |
| **Attachment** | Arquivos/imagens num lugar só | `{entityType, entityId, url|blob, mimeType}` em vez de base64 inline em cada modelo |
| **EntityLink** | Grafo genérico (liga qualquer coisa) | `{fromType, fromId, toType, toId, kind}` — ex.: Transaction↔Project, Task↔LearningGoal |

**`entityType` canônico** (use estes nomes): `task`, `note`, `transaction`, `account`, `project`,
`event`, `friend`, `client`, `invoice`, `media`, `link`, `flashcardDeck`, `studySubject`, `goal`,
`wardrobeItem`, `workout`, `meal`.

### Helpers prontos (lib/)
- `lib/activity.ts` → `logActivity({action, module, entityType, entityId, summary, meta})` (best-effort,
  nunca lança) e `getRecentActivity(limit)`.
- `lib/notifications.ts` → `notify()`, `getNotificationInbox()`, `markRead()`, `markAllRead()`,
  `generateReminders()` (deriva lembretes de faturas/eventos/aniversários/tarefas/flashcards, idempotente).
- `lib/connect.ts` → `tagEntity()/untagEntity()/getEntityTags()/getEntitiesByTag()`,
  `linkEntities()/getLinkedEntities()`, `attach()/getAttachments()/removeAttachment()`.

### Implementado (vivo)
- **Notificações**: sino no `Sidebar` (`components/notifications/notification-bell.tsx`) com contador de
  não-lidas, inbox (Popover), marcar lida / todas, e botão "gerar lembretes". Server actions em
  `app/(dashboard)/notifications/actions.ts`. Layout injeta o inbox inicial (`getNotificationInbox`).
  Além do `generateReminders` (idempotente, derivado), há **avisos pontuais** via `notify()` no momento do
  evento: **receber fatura** (`receiveInvoicePayment` → `INVOICE_PAID`) e **criar evento nas próximas 24h**
  (`createEvent` → `EVENT`, mesma chave do reminder, então não duplica). Ícones por tipo no sino.
- **Linha do Tempo** (`/timeline`): lê `getRecentActivity`, agrupa por dia. Link no menu (grupo Central).
- **Anotações** (`/notes`): central de anotações de estudo (`StudyNote`) — `app/(dashboard)/notes/{actions,page}.tsx`
  + `components/notes/notes-client.tsx`. Criar/editar (modal global), favoritar, vincular a uma matéria, busca,
  soft-delete p/ lixeira e o tecido conectivo embutido (Tags/Anexos/Relações). Link no menu (sub-item de Estudos).
  Deu UI à `StudyNote`, que antes só era criada por sessões/IA.
- **Lixeira** (`/trash`): `app/(dashboard)/trash/{actions,page}.tsx` + `components/trash/trash-client.tsx`.
  Restaurar / excluir em definitivo / esvaziar. Link no menu (grupo Sistema).
- **Soft-delete + Lixeira** ativo em: **Tarefas, Links, Desejos (Wishlist), Mídia (Entretenimento),
  Eventos (Agenda), Conexões (Friend), Clientes (Business), Peças (Wardrobe), Transações (Finanças),
  Projetos, Anotações (StudyNote)** — 11 tipos.
  O delete seta `deletedAt`; os reads de cada um filtram `deletedAt: null` (dashboard, página do módulo,
  agenda/agregador, `generateReminders`, detalhe da matéria conforme o caso). A `/trash` lista os 11 tipos com restaurar/excluir/esvaziar.
  Ao purgar um **Cliente**, a cascata do schema remove billings/invoices vinculados.
  **Projeto (caso especial — filhos):** o soft-delete trasha **só o projeto**; tarefas/eventos/reuniões/vagas
  têm relação `SetNull` (não cascade), então **sobrevivem** e reaparecem no board ao restaurar. Reads filtrados:
  projects/page, board `[slug]` (404 se trashed) + filtro de tarefas no board, dashboard, jobs/page, e os
  ownership checks de createTask/linkJobToProject/meeting (não dá p/ anexar a projeto na lixeira). Purgar o
  projeto dispara `SetNull` → as tarefas vão para o **Inbox** (nada é perdido).
  **Transação (caso especial — saldo):** o soft-delete **reverte** o impacto no saldo da conta (item na lixeira
  não conta); o **restore** reaplica (`restoreTransaction` em `trash/actions.ts`, atômico); o purge só apaga
  (saldo já revertido). Tudo só ajusta contas **não** conectadas (Pluggy sincroniza sozinho). Reads filtrados:
  `finance/page`, `finance/transactions/page`, dashboard (agregados receita/despesa + recentes), agenda-aggregator.
- **ActivityLog**: registrado em Tarefas (`create/toggle/delete`), **Finanças** (`createTransaction`/`deleteTransaction`),
  **Agenda** (`createEvent`/`deleteEvent`), **Negócios** (`createClient`/`deleteClient`/`receiveInvoicePayment`),
  **Conexões** (`createFriend`/`deleteFriend`) e **Closet** (`createWardrobeItem`/`deleteWardrobeItem`).
  Ações `INCOME`/`EXPENSE`/`RESTORE` além de `CREATE`/`DELETE`. Aparece na `/timeline`.
- **Tags, Anexos & Relações** (`/connect`): central cross-módulo com 3 abas. **Tags** lista tags com contagem e,
  ao selecionar, mostra tudo que ela conecta entre os módulos (título + rota resolvidos por `lib/entity-resolver.ts`).
  **Anexos** lista todos os `Attachment` com a entidade de origem. **Relações** lista o grafo `EntityLink` inteiro
  (as duas pontas resolvidas: `from → kind → to`), com abrir/remover. Server actions em `app/(dashboard)/connect/actions.ts`.
- **Editores inline reutilizáveis** (`components/connect/`):
  - `<EntityTags entityType entityId />` — adiciona/remove tags com autocomplete.
  - `<EntityAttachments entityType entityId />` — sobe arquivo (base64 portável, máx ~4MB) ou link, lista e remove.
  - `<EntityLinks entityType entityId />` — relaciona com qualquer entidade de outro módulo (grafo `EntityLink`):
    busca cross-módulo (`lib/entity-search.ts`) + tipo de relação (Relacionado/Bloqueia/Derivado de/Referencia),
    mostra direção (→ aponta / ← apontado) e abre a contraparte.
  - `<EntityConnectionsDialog entityType item onOpenChange />` — diálogo único (abas **Tags + Anexos + Relações**)
    para soltar num menu de item: `setItem({ id, title })` abre; um por módulo (regra: 1 Dialog global, fora do `.map()`).
  - Mapas client-safe de ícone/rótulo: `components/connect/entity-meta.ts` (espelha o resolver, sem Prisma).
- **Já plugado em 16 entityTypes**:
  - Via `<EntityConnectionsDialog>` no menu do card: **Links** (`link`), **Agenda** (`event`), **Negócios** (`client`),
    **Conexões** (`friend`), **Closet** (`wardrobeItem`), **Flashcards** (`flashcardDeck`), **Treinos** (`workout`),
    **Refeições** (`meal`), **Contas** (`account`).
  - Embutido no modal/painel de detalhe (sem diálogo aninhado): **Tarefas** (`task`), **Entretenimento** (`media`),
    **Projetos** (`project`, exceto o Inbox virtual), **Estudos/Matérias** (`studySubject`), **Anotações** (`note`),
    **Transações** (`transaction`) e **Faturas** (`invoice`) — os 3 últimos dentro do `<form>` do modal de edição,
    por isso os editores são **form-safe** (botões `type="button"`, inputs com `preventDefault` no Enter).
  - **Sem UI** hoje (único faltante): `goal` (LearningGoal) não tem tela de lista/detalhe — aparece só na
    busca/resolver do connect e no wipe de segurança.

### Próximos passos (sugestão)
1. **Tecido conectivo: cobertura completa** dos entityTypes que têm UI (16/17). Só falta `goal` (LearningGoal), que
   **não tem tela** — quando ganhar lista/detalhe (provável "Metas de Aprendizado"), é só soltar
   `<EntityConnectionsDialog>` (menu) ou os 3 editores form-safe (modal). A central `/connect` já agrega tudo.
2. Estender **soft-delete** ao que falta: **Note** (StudyNote) — hoje só é apagado no wipe de segurança e via
   IA; não tem delete na UI dedicada. Quando ganhar UI de excluir, seguir o padrão (`deletedAt` + `/trash` switch +
   trash-client TYPE_ICON/LABEL).
   NOTA: os **reads de IA** (`lib/ai-data.ts` listas+resumos, `lib/ai-context.ts`) agora **filtram `deletedAt`**
   nos 8 modelos com soft-delete (transaction/task/project/mediaItem/client/friend/wardrobeItem/event) — itens na
   lixeira não aparecem mais para o Cérebro Digital. Ainda NÃO filtram: **backup/export** (proposital — backup
   completo) e **storage-analytics** (mede tamanho real, inclui lixeira). As buscas por id de mutação da IA
   (`recordLabel`/`deleteRecord` em `ai-data.ts`) seguem sem filtro de propósito (a IA opera sobre um id já dado).
3. **Mais `notify` pontuais** (já há recebimento de fatura + evento em 24h): ex. tarefa criada já vencida,
   meta de estudo concluída, desafio em risco de quebrar a sequência.

---

## Migrations vs. schema (fonte da verdade p/ deploy)

As migrations do Prisma (`prisma/migrations/`) são a **fonte da verdade do deploy** (`prisma migrate deploy`
em produção/Vercel/Turso recria o banco a partir delas). Por um tempo o time evoluiu o schema via
`prisma db push` (rápido, mas **não** grava migration), então a pasta driftou e ficou ~5 meses atrás do
`schema.prisma` (sem Módulo 12, soft-delete, Categorias, índices…). Um deploy limpo teria criado um banco
**incompleto**.

**Reconciliado em 03/jun/2026** (baseline): a migration `…_reconcile_schema_drift` captura todo o drift e foi
marcada como aplicada (`migrate resolve --applied`, sem tocar nos dados locais); a `…_add_performance_indexes`
adiciona os índices de soft-delete e foi aplicada de verdade. Conferido: `migrate diff` banco↔schema e
migrations↔schema dão **vazio** (cobertura 100%).

**Regra daqui pra frente — não driftar de novo:**
- Mudou o `schema.prisma`? Gere migration com `npx prisma migrate dev --name <descrição>` (não só `db push`).
- `db push` só para protótipo descartável. Se usar, depois **reconcilie** (gerar migration do diff + `resolve`).
- Regenere o `prisma/baseline.sql` (`npm run db:baseline`) — é o que `lib/db-bootstrap.ts` (`ensureSchema`)
  usa para criar o schema em SQLite/Turso na nuvem. Migrations e baseline devem andar juntos.
- No Windows, **pare o app** antes de `migrate`/`generate` (lock da DLL — `scripts/stop.mjs`).

## Hardening futuro (decisões em aberto)

- **`userId` obrigatório (NOT NULL) em tudo**: mais correto, mas exige ajustar ~35 arquivos que tratam
  `userId` como opcional (`userId ?? ""`, `where: { userId }`). Fazer num lote dedicado.
- **Sincronização multi-dispositivo**: com `updatedAt` consistente, dá para adicionar `SyncCursor`/`Device`
  e um padrão outbox para offline-first.
- **Enums**: status/type/priority são `String` (SQLite não tem enum nativo via Prisma) — validar no app.

---

_Última grande reestruturação: 03/jun/2026 (Fases A–D: integridade, índices, Tags/Categorias,
Notificações/ActivityLog, Anexos/EntityLink/soft-delete). Backup pré-migração: `prisma/life_os.backup-pre-schema.db`._

_03/jun/2026 — Próximos passos (lote 1): soft-delete+lixeira estendido a Event/Friend/Client/WardrobeItem (8 tipos),
ActivityLog espalhado nas mutações-chave, e central **Tags & Anexos** (`/connect`) + `<EntityTags>` reutilizável
(`lib/entity-resolver.ts`, `app/(dashboard)/connect/`, `components/connect/`)._

_03/jun/2026 — Próximos passos (lote 2): produtor de anexos `<EntityAttachments>` (base64/link) e diálogo
combinado `<EntityConnectionsDialog>` (Tags + Anexos) plugados em Links, Agenda, Negócios, Conexões e Tarefas.
Agora as duas abas da `/connect` recebem dados reais de 5 módulos._

_03/jun/2026 — Próximos passos (lote 3): UI do grafo `EntityLink` — `<EntityLinks>` (busca cross-módulo
`lib/entity-search.ts` + relação tipada/direcional) vira a 3ª aba **Relações** do `<EntityConnectionsDialog>`,
chegando de graça aos 5 módulos já plugados. Mapas client-safe extraídos p/ `components/connect/entity-meta.ts`._

_03/jun/2026 — Próximos passos (lote 4): tecido conectivo (Tags+Anexos+Relações) plugado em mais 3 módulos —
**Closet** (dialog), **Entretenimento** e **Projetos** (embutidos no modal de detalhe). Total: 8 entityTypes._

_03/jun/2026 — Próximos passos (lote 5): soft-delete de **Transação** (9º tipo na lixeira) com reversão/reaplicação
de saldo da conta — `deleteTransaction` reverte, `restoreTransaction` reaplica (atômico), purge só apaga;
reads de finanças/dashboard/agregador filtrados. Restam Project e Note._

_03/jun/2026 — Próximos passos (lote 6): soft-delete de **Projeto** (10º tipo) — trasha só o projeto, tarefas
sobrevivem (`SetNull`) e voltam no restore; `deleteProject` não apaga mais tarefas; reads de projects/board/
dashboard/jobs + ownership checks filtrados; corrigida lacuna do board que mostrava tarefas na lixeira; textos
do menu de exclusão ajustados p/ "mover para a lixeira". Resta só Note._

_03/jun/2026 — Próximos passos (lote 7): **visão de grafo agregada** na `/connect` — 3ª aba **Relações** lista
todo o `EntityLink` do usuário (`getAllLinksCenter`, ambas as pontas resolvidas, `from → kind → to`, abrir/remover).
Simetria completa: Tags, Anexos e Relações agora têm visão central._

_03/jun/2026 — Próximos passos (lote 8): **`notify` pontual** — `receiveInvoicePayment` avisa o recebimento
(`INVOICE_PAID`, novo ícone no sino) e `createEvent` avisa eventos nas próximas 24h (`EVENT`, mesma chave do
reminder p/ não duplicar)._

_03/jun/2026 — Próximos passos (lote 9): tecido conectivo plugado em +4 módulos — **Estudos/Matérias**
(`studySubject`, no modal de detalhe), **Flashcards** (`flashcardDeck`), **Treinos** (`workout`) e **Refeições**
(`meal`). Total: 12 entityTypes. Faltam só os de baixo tráfego (transaction/invoice/account/goal/note)._

_03/jun/2026 — Próximos passos (lote 10): fechados os entityTypes restantes com UI — **Transações** (`transaction`)
e **Faturas** (`invoice`) embutidos no `<form>` dos modais de edição (editores agora form-safe), e **Contas**
(`account`) via diálogo. Total: 15/17 entityTypes (faltam só `goal`/`note`, sem tela). Frente de tecido conectivo concluída._

_03/jun/2026 — Otimização camada de app (deploy-prep, lote 2): (1) **cache em memória do config de banco**
(`lib/db-config.ts`) — o Proxy do Prisma resolve o perfil a cada acesso de propriedade; em modo local isso fazia
uma leitura síncrona de disco por query (dezenas/página). Cache invalidado só em `writeConfig`. (2) **Dashboard
escala com histórico**: `studySession` deixou de carregar TODAS as sessões (com `subject`) — agora usa
`groupBy({ by: subjectId, _sum: durationMinutes, _count })`, agregando no banco._

_03/jun/2026 — Otimização camada de app (deploy-prep, lote 3): **Transações server-driven** — a lista
(`finance/transactions`) deixou de carregar TODAS as transações no cliente. Agora a página lê `searchParams`
(`period`/`type`/`account`/`q`/`page`), monta um único `where` e roda: lista **paginada** (`skip`/`take` 50),
**resumo** via `groupBy([type], _sum amount)`, `count`, e dados do gráfico (6 meses, 3 colunas). Período padrão:
últimos 12 meses. A view virou apresentacional + controles que atualizam a URL (busca com debounce, `useTransition`)
+ paginação. Casa com o índice `[userId, deletedAt, date]`._

_03/jun/2026 — Enums validados nas escritas da IA (deploy-prep, lote 7): nova fonte da verdade `lib/enums.ts`
(`TASK_STATUSES`, `TASK_PRIORITIES`, `CLIENT_STATUSES`, `TRANSACTION_TYPES` + `asEnum`/`coerceEnum`). A IA gravava
`status`/`priority` vindos do LLM **direto** no banco — um "Concluído" no lugar de "DONE" corromperia filtros e
contagens. Agora `mutateModule`: no **CREATE** coage para um valor válido (default do schema se inválido); no
**UPDATE** ignora valor inválido (não sobrescreve). Aplicado a Tarefas (status+priority) e CRM (status); FINANCE
type já era binário (seguro). Só conjuntos de domínio FECHADO foram validados — Project/MediaItem ficaram de fora
para não coagir valores legítimos por engano. Enums são `String` no SQLite (sem enum nativo via Prisma)._

_03/jun/2026 — Atomicidade de saldo (deploy-prep, lote 6): auditadas todas as mutações que mexem em saldo de
conta. Já eram atômicas (`$transaction`): `finance/actions/transaction.ts` (create/update), `trash/actions.ts`
(restore), `business/actions.ts` (receber/editar fatura) e `finance/actions/import-statement.ts`. **Única
lacuna: a IA** (`lib/ai-data.ts`) fazia create+saldo e delete+reversão em `await`s soltos — agora ambos em
`prisma.$transaction` usando `balance: { increment: delta }` (atômico no banco, sem read-modify-write nem
corrida). `handleUpdate` da IA não altera valor de propósito (sem drift). Minor conhecido: o find-or-create de
matéria no CREATE STUDIES da IA pode gerar matéria duplicada sob corrida (sem unique em `[userId,title]`) — não
corrompe dados; resolver com unique se incomodar._

_03/jun/2026 — Integridade de dados (deploy-prep, lote 5): **IA não enxerga mais a lixeira** — `queryModule`
(listas), `querySummary` (contagens/agregados) e `getUserContext` (contexto global) passaram a filtrar
`deletedAt: null` nos 8 modelos com soft-delete. Antes, tarefas/transações/clientes etc. na lixeira vazavam para
o contexto e podiam ser referenciados/contados pelo Cérebro Digital. Backup (completo) e storage-stats (mede
tamanho) seguem sem filtro, de propósito. Fecha a lacuna registrada nos "Próximos passos" #2._

_03/jun/2026 — Otimização camada de app (deploy-prep, lote 4): **dashboard, bloco de Negócios** — em vez de
carregar `client → billings → invoices` aninhado e sem limite só para somar recebíveis/atrasados, agora usa
2× `invoice.aggregate(_sum: value)` (a vencer × atrasado) + 1× `findMany(take: 5)` das faturas mais próximas
do vencimento, preservando o filtro de cliente não-deletado (`billing.client.deletedAt: null`). Usa o índice
`[userId, status, dueDate]`. (`finance/page.tsx` já estava OK: `take: 50` + janela de 12 meses no gráfico.)
Com isso, os principais reads sem limite do app estão resolvidos; os demais `findMany` são limitados por
intervalo de data (agenda/saúde) ou precisam mesmo do conjunto (backup/export/storage-stats)._

_03/jun/2026 — Otimização & escalabilidade (deploy-prep): (1) **migrations reconciliadas** com o schema via
baseline (`reconcile_schema_drift` + `migrate resolve`), destravando `prisma migrate deploy` em produção;
(2) **13 índices compostos** novos p/ os caminhos quentes — `[userId, deletedAt]` nos 12 modelos com soft-delete
(`[userId, deletedAt, date]` em Transaction, `[userId, deletedAt, startTime]` em Event) e `[userId, status, dueDate]`
em Invoice (migration `add_performance_indexes`); (3) `baseline.sql` regenerado (87→100 índices). Drift zero
verificado nas duas pontas. Hardening (userId NOT NULL / updatedAt p/ sync) ficou para lote dedicado._

_03/jun/2026 — Próximos passos (lote 11): **Central de Anotações** (`/notes`) criada do zero — deu UI à `StudyNote`
(criar/editar/favoritar/buscar/vincular matéria), com soft-delete (11º tipo na lixeira) e tecido conectivo embutido
(`note` agora plugado, 16/17 entityTypes). Detalhe da matéria passou a filtrar notas `deletedAt`. Só `goal` segue sem tela._
