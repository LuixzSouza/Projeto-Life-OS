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
- **Linha do Tempo** (`/timeline`): lê `getRecentActivity`, agrupa por dia. Link no menu (grupo Central).
- **Lixeira** (`/trash`): `app/(dashboard)/trash/{actions,page}.tsx` + `components/trash/trash-client.tsx`.
  Restaurar / excluir em definitivo / esvaziar. Link no menu (grupo Sistema).
- **Soft-delete de Tarefas**: `deleteTask` agora seta `deletedAt` (vai pra lixeira); reads de tarefa
  filtram `deletedAt: null` em dashboard, projects (lista + counts), projects/[slug], agenda e agenda-aggregator.
- **ActivityLog**: `createTask`/`toggleTask`/`deleteTask` registram atividade — padrão a replicar nos demais módulos.

### Próximos passos (sugestão)
1. Espalhar `logActivity` + `notify` nas demais mutações (pagar fatura, criar transação/evento…).
2. Estender o **soft-delete** (deletedAt + filtro nos reads) e a lixeira aos outros modelos
   (Transaction, Project, Note, SavedLink, MediaItem, Event, WishlistItem, Friend, Client, WardrobeItem).
   NOTA: reads de IA (`lib/ai-data.ts`, `lib/ai-context.ts`) ainda NÃO filtram deletedAt — incluir ao estender.
3. UI de **tags** (filtro cross-módulo) e **central de anexos**.

---

## Hardening futuro (decisões em aberto)

- **`userId` obrigatório (NOT NULL) em tudo**: mais correto, mas exige ajustar ~35 arquivos que tratam
  `userId` como opcional (`userId ?? ""`, `where: { userId }`). Fazer num lote dedicado.
- **Sincronização multi-dispositivo**: com `updatedAt` consistente, dá para adicionar `SyncCursor`/`Device`
  e um padrão outbox para offline-first.
- **Enums**: status/type/priority são `String` (SQLite não tem enum nativo via Prisma) — validar no app.

---

_Última grande reestruturação: 03/jun/2026 (Fases A–D: integridade, índices, Tags/Categorias,
Notificações/ActivityLog, Anexos/EntityLink/soft-delete). Backup pré-migração: `prisma/life_os.backup-pre-schema.db`._
