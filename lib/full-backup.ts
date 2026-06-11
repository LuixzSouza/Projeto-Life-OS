// ============================================================================
// BACKUP COMPLETO (v3) — ponte universal de dados do Life OS
// ============================================================================
// Uma única fonte de verdade para exportar/importar/zerar TODOS os models do
// usuário. O registro BACKUP_ENTRIES está em ordem pai→filho: a importação
// percorre na ordem direta (pais primeiro) e o wipe na ordem reversa (filhos
// primeiro), respeitando as FKs em qualquer dialeto.
//
// Formato do arquivo (schemaVersion 3):
//   { meta: { system, schemaVersion, exportedAt, modules, counts }, user, data: { <key>: rows[] } }
// IDs são PRESERVADOS (uuid/cuid), então as relações sobrevivem ao round-trip.
// O userId é sempre remapeado para o usuário logado na importação.

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const BACKUP_SCHEMA_VERSION = 3;

export type BackupModule =
  | "tasks"
  | "finance"
  | "crm"
  | "connections"
  | "agenda"
  | "studies"
  | "health"
  | "ai"
  | "vault"
  | "links"
  | "entertainment"
  | "wardrobe"
  | "sites"
  | "system";

export const BACKUP_MODULES: { id: BackupModule; label: string }[] = [
  { id: "tasks", label: "Projetos & Tarefas" },
  { id: "finance", label: "Finanças" },
  { id: "crm", label: "Negócios & Clientes" },
  { id: "connections", label: "Conexões" },
  { id: "agenda", label: "Agenda & Rotinas" },
  { id: "studies", label: "Estudos, Notas & Flashcards" },
  { id: "health", label: "Saúde & Treinos" },
  { id: "ai", label: "IA (conversas e memórias)" },
  { id: "vault", label: "Cofre de Acessos" },
  { id: "links", label: "Links Salvos" },
  { id: "entertainment", label: "Entretenimento" },
  { id: "wardrobe", label: "Closet" },
  { id: "sites", label: "Sites Gerenciados" },
  { id: "system", label: "Configurações & Sistema" },
];

type Row = Record<string, unknown>;

export interface FullBackupMeta {
  system: string;
  schemaVersion: number;
  exportedAt: string;
  modules: BackupModule[] | "all";
  counts: Record<string, number>;
}

export interface FullBackupFile {
  meta: FullBackupMeta;
  user?: Row | null;
  data: Record<string, unknown>;
}

export interface ImportSummary {
  imported: Record<string, number>;
  skipped: Record<string, number>;
  total: number;
}

// Delegate estrutural mínimo compatível com qualquer model do client gerado.
// `never[]` em createMany satisfaz a contravariância de TODOS os
// XCreateManyInput; o único cast vive dentro de std().
interface StdDelegate {
  findMany(args: { where: { userId: string } }): Promise<unknown[]>;
  createMany(args: { data: never[] }): Promise<unknown>;
  deleteMany(args: { where: { userId: string } }): Promise<unknown>;
}

interface Fk {
  field: string;
  target: string; // key da entry referenciada
  required?: boolean; // FK obrigatória: sem alvo, a linha é pulada (não anulada)
}

interface ImportContext {
  userId: string;
  ids: Map<string, Set<string>>;
  remaps: Map<string, Map<string, string>>;
}

interface BackupEntry {
  key: string;
  model: string; // nome do model no schema (p/ sanitização via DMMF)
  module: BackupModule;
  fetch(userId: string): Promise<unknown[]>;
  /** Insere um lote de linhas já saneadas/remapeadas. */
  create?(rows: Row[], userId: string): Promise<unknown>;
  /** Importação totalmente custom (1:1, taxonomias globais). Retorna nº importado. */
  importSpecial?(rows: Row[], ctx: ImportContext): Promise<number>;
  wipe?(userId: string): Promise<unknown>;
  fks?: Fk[];
  /** FK para o próprio model (hierarquias): inserida em 2 passos. */
  selfRef?: { field: string; update(id: string, parentId: string, userId: string): Promise<unknown> };
  /** Última tentativa em falha de linha única (ex.: slug duplicado). */
  mutateOnRetry?(row: Row): Row;
}

function std(key: string, model: string, module: BackupModule, d: StdDelegate, extra?: Partial<BackupEntry>): BackupEntry {
  return {
    key,
    model,
    module,
    fetch: (userId) => d.findMany({ where: { userId } }),
    create: (rows) => d.createMany({ data: rows as never[] }),
    wipe: (userId) => d.deleteMany({ where: { userId } }),
    ...extra,
  };
}

function upsertOneToOne(
  key: string,
  model: string,
  fetchOne: (userId: string) => Promise<Row | null>,
  upsert: (data: Row, userId: string) => Promise<unknown>,
  wipe?: (userId: string) => Promise<unknown>,
): BackupEntry {
  return {
    key,
    model,
    module: "system",
    fetch: async (userId) => {
      const row = await fetchOne(userId);
      return row ? [row] : [];
    },
    importSpecial: async (rows, ctx) => {
      const row = rows[0];
      if (!row) return 0;
      const data: Row = { ...row };
      delete data.id;
      delete data.userId;
      await upsert(data, ctx.userId);
      return 1;
    },
    wipe,
  };
}

// ----------------------------------------------------------------------------
// REGISTRO — ordem pai→filho. Toda mudança de schema deve manter este registro
// em dia (o lint de cobertura é a leitura do schema.prisma lado a lado).
// ----------------------------------------------------------------------------

const BACKUP_ENTRIES: BackupEntry[] = [
  // Taxonomia GLOBAL (sem dono): upsert por id com remap por nome — nunca é zerada.
  {
    key: "contentTypes",
    model: "ContentType",
    module: "studies",
    fetch: () => prisma.contentType.findMany({}),
    importSpecial: async (rows, ctx) => {
      const remap = new Map<string, string>();
      let imported = 0;
      const known = ctx.ids.get("contentTypes") ?? new Set<string>();
      for (const raw of rows) {
        const r = raw as { id?: string; name?: string; icon?: string | null; color?: string | null };
        if (!r.id || !r.name) continue;
        if (known.has(r.id)) continue;
        const byName = await prisma.contentType.findFirst({ where: { name: r.name } });
        if (byName) {
          remap.set(r.id, byName.id);
          known.add(byName.id);
          continue;
        }
        await prisma.contentType.create({ data: { id: r.id, name: r.name, icon: r.icon ?? null, color: r.color ?? null } });
        known.add(r.id);
        imported++;
      }
      ctx.ids.set("contentTypes", known);
      ctx.remaps.set("contentTypes", remap);
      return imported;
    },
  },

  // 1:1 com o usuário — upsert (preferências sobrevivem mesmo sem backup).
  upsertOneToOne(
    "settings",
    "Settings",
    (userId) => prisma.settings.findUnique({ where: { userId } }),
    async (data, userId) => {
      const input = data as unknown as Prisma.SettingsUncheckedUpdateInput;
      await prisma.settings.upsert({
        where: { userId },
        update: input,
        create: { ...(data as unknown as Omit<Prisma.SettingsUncheckedCreateInput, "userId">), userId },
      });
    },
  ),
  upsertOneToOne(
    "userStats",
    "UserStats",
    (userId) => prisma.userStats.findUnique({ where: { userId } }),
    async (data, userId) => {
      const input = data as unknown as Prisma.UserStatsUncheckedUpdateInput;
      await prisma.userStats.upsert({
        where: { userId },
        update: input,
        create: { ...(data as unknown as Omit<Prisma.UserStatsUncheckedCreateInput, "userId">), userId },
      });
    },
  ),
  upsertOneToOne(
    "portfolio",
    "Portfolio",
    (userId) => prisma.portfolio.findUnique({ where: { userId } }),
    async (data, userId) => {
      const input = data as unknown as Prisma.PortfolioUncheckedUpdateInput;
      await prisma.portfolio.upsert({
        where: { userId },
        update: input,
        create: { ...(data as unknown as Omit<Prisma.PortfolioUncheckedCreateInput, "userId">), userId },
      });
    },
    (userId) => prisma.portfolio.deleteMany({ where: { userId } }),
  ),

  // Tecido conectivo / vocabulários (pais de muita coisa)
  std("tags", "Tag", "system", prisma.tag),
  std("categories", "Category", "finance", prisma.category, {
    selfRef: {
      field: "parentId",
      update: (id, parentId, userId) => prisma.category.updateMany({ where: { id, userId }, data: { parentId } }),
    },
  }),
  std("notebooks", "Notebook", "studies", prisma.notebook),
  std("friends", "Friend", "connections", prisma.friend),
  std("clients", "Client", "crm", prisma.client, {
    fks: [{ field: "friendId", target: "friends" }],
  }),

  // Finanças
  std("accounts", "Account", "finance", prisma.account),
  std("transactions", "Transaction", "finance", prisma.transaction, {
    fks: [
      { field: "accountId", target: "accounts", required: true },
      { field: "categoryId", target: "categories" },
    ],
  }),
  std("recurringExpenses", "RecurringExpense", "finance", prisma.recurringExpense, {
    fks: [{ field: "categoryId", target: "categories" }],
  }),
  std("recurringExpensePayments", "RecurringExpensePayment", "finance", prisma.recurringExpensePayment, {
    fks: [
      { field: "recurringExpenseId", target: "recurringExpenses", required: true },
      { field: "transactionId", target: "transactions" },
    ],
  }),
  std("wishlistItems", "WishlistItem", "finance", prisma.wishlistItem),
  std("investmentHoldings", "InvestmentHolding", "finance", prisma.investmentHolding),

  // Negócios & Clientes
  std("billings", "Billing", "crm", prisma.billing, {
    fks: [{ field: "clientId", target: "clients", required: true }],
  }),
  std("recurringCharges", "RecurringCharge", "finance", prisma.recurringCharge, {
    fks: [
      { field: "clientId", target: "clients" },
      { field: "billingId", target: "billings" },
    ],
  }),
  std("invoices", "Invoice", "crm", prisma.invoice, {
    fks: [
      { field: "billingId", target: "billings", required: true },
      { field: "transactionId", target: "transactions" },
    ],
  }),

  // Projetos, carreira e agenda
  std("projects", "Project", "tasks", prisma.project, {
    fks: [{ field: "clientId", target: "clients" }],
    mutateOnRetry: (row) => ({ ...row, slug: `${String(row.slug ?? "projeto")}-${Math.random().toString(36).slice(2, 6)}` }),
  }),
  std("tasks", "Task", "tasks", prisma.task, {
    fks: [{ field: "projectId", target: "projects" }],
  }),
  std("meetings", "Meeting", "tasks", prisma.meeting, {
    fks: [{ field: "projectId", target: "projects" }],
  }),
  std("jobApplications", "JobApplication", "tasks", prisma.jobApplication, {
    fks: [{ field: "projectId", target: "projects" }],
  }),
  std("jobEvents", "JobEvent", "tasks", prisma.jobEvent, {
    fks: [{ field: "jobId", target: "jobApplications", required: true }],
  }),
  std("events", "Event", "agenda", prisma.event, {
    fks: [
      { field: "projectId", target: "projects" },
      { field: "taskId", target: "tasks" },
    ],
  }),
  std("routineItems", "RoutineItem", "agenda", prisma.routineItem),
  std("themedDays", "ThemedDay", "agenda", prisma.themedDay),
  std("focusSessions", "FocusSession", "agenda", prisma.focusSession),

  // Estudos
  std("studySubjects", "StudySubject", "studies", prisma.studySubject, {
    selfRef: {
      field: "parentId",
      update: (id, parentId, userId) => prisma.studySubject.updateMany({ where: { id, userId }, data: { parentId } }),
    },
  }),
  std("studyContents", "StudyContent", "studies", prisma.studyContent, {
    fks: [
      { field: "typeId", target: "contentTypes", required: true },
      { field: "subjectId", target: "studySubjects", required: true },
    ],
  }),
  std("studySessions", "StudySession", "studies", prisma.studySession, {
    fks: [{ field: "subjectId", target: "studySubjects", required: true }],
  }),
  std("studyNotes", "StudyNote", "studies", prisma.studyNote, {
    fks: [
      { field: "notebookId", target: "notebooks" },
      { field: "projectId", target: "projects" },
      { field: "subjectId", target: "studySubjects" },
      { field: "contentId", target: "studyContents" },
      { field: "sessionId", target: "studySessions" },
    ],
  }),
  std("studyNoteVersions", "StudyNoteVersion", "studies", prisma.studyNoteVersion, {
    fks: [{ field: "noteId", target: "studyNotes", required: true }],
  }),
  std("noteImages", "NoteImage", "studies", prisma.noteImage, {
    fks: [{ field: "noteId", target: "studyNotes" }],
  }),
  std("learningGoals", "LearningGoal", "studies", prisma.learningGoal, {
    fks: [{ field: "subjectId", target: "studySubjects" }],
  }),
  std("learningTasks", "LearningTask", "studies", prisma.learningTask, {
    fks: [{ field: "goalId", target: "learningGoals", required: true }],
  }),
  std("flashcardDecks", "FlashcardDeck", "studies", prisma.flashcardDeck, {
    fks: [{ field: "studySubjectId", target: "studySubjects" }],
  }),
  std("flashcards", "Flashcard", "studies", prisma.flashcard, {
    fks: [{ field: "deckId", target: "flashcardDecks", required: true }],
  }),

  // Saúde & treinos
  std("workouts", "Workout", "health", prisma.workout),
  std("shoes", "Shoe", "health", prisma.shoe),
  std("workoutPlans", "WorkoutPlan", "health", prisma.workoutPlan),
  std("workoutPhotos", "WorkoutPhoto", "health", prisma.workoutPhoto),
  std("energyCheckins", "EnergyCheckin", "health", prisma.energyCheckin),
  std("habits", "Habit", "health", prisma.habit),
  std("habitLogs", "HabitLog", "health", prisma.habitLog, {
    fks: [{ field: "habitId", target: "habits", required: true }],
  }),
  std("healthMetrics", "HealthMetric", "health", prisma.healthMetric),
  std("bodyMeasurements", "BodyMeasurement", "health", prisma.bodyMeasurement),
  std("meals", "Meal", "health", prisma.meal),
  std("mealPlans", "MealPlan", "health", prisma.mealPlan),
  std("challenges", "Challenge", "health", prisma.challenge),
  std("challengeCheckins", "ChallengeCheckin", "health", prisma.challengeCheckin, {
    fks: [{ field: "challengeId", target: "challenges", required: true }],
  }),

  // Sites (CMS)
  std("managedSites", "ManagedSite", "sites", prisma.managedSite),
  std("sitePages", "SitePage", "sites", prisma.sitePage, {
    fks: [{ field: "siteId", target: "managedSites", required: true }],
  }),

  // IA
  std("aiChats", "AiChat", "ai", prisma.aiChat),
  std("aiMessages", "AiMessage", "ai", prisma.aiMessage, {
    fks: [{ field: "chatId", target: "aiChats", required: true }],
  }),
  std("aiMemories", "AiMemory", "ai", prisma.aiMemory),
  std("aiAutomations", "AiAutomation", "ai", prisma.aiAutomation),
  std("aiEmbeddings", "AiEmbedding", "ai", prisma.aiEmbedding),

  // Acervos pessoais
  std("accessItems", "AccessItem", "vault", prisma.accessItem),
  std("savedLinks", "SavedLink", "links", prisma.savedLink),
  std("mediaItems", "MediaItem", "entertainment", prisma.mediaItem),
  std("wardrobeItems", "WardrobeItem", "wardrobe", prisma.wardrobeItem),

  // Tecido conectivo dependente + sistema
  std("taggables", "Taggable", "system", prisma.taggable, {
    fks: [{ field: "tagId", target: "tags", required: true }],
  }),
  std("notifications", "Notification", "system", prisma.notification),
  std("activityLogs", "ActivityLog", "system", prisma.activityLog),
  std("attachments", "Attachment", "system", prisma.attachment),
  std("entityLinks", "EntityLink", "system", prisma.entityLink),
  std("backupLogs", "BackupLog", "system", prisma.backupLog),
];

// Preferências que sobrevivem ao wipe (o import faz upsert delas depois).
const WIPE_KEEP = new Set(["settings", "userStats"]);

// ----------------------------------------------------------------------------
// ORDEM DE CÓPIA INSTÂNCIA-INTEIRA (motor de migração entre bancos — Fase 3
// do DATABASE_ROADMAP, lib/db-copy.ts). Deriva do registro acima para nunca
// driftar: User vem primeiro (todo mundo aponta p/ ele), depois pai→filho.
// ----------------------------------------------------------------------------

export interface CopyModelSpec {
  /** Nome do model no schema (igual ao delegate: User → client.user). */
  model: string;
  /** FK para o próprio model (hierarquias) — copiada em 2 passos. */
  selfRefField?: string;
}

export const COPY_MODEL_ORDER: CopyModelSpec[] = [
  { model: "User" },
  ...BACKUP_ENTRIES.map((e) => ({
    model: e.model,
    ...(e.selfRef ? { selfRefField: e.selfRef.field } : {}),
  })),
];

// ----------------------------------------------------------------------------
// EXPORT
// ----------------------------------------------------------------------------

export async function buildFullBackup(
  userId: string,
  modules?: BackupModule[] | null,
): Promise<FullBackupFile> {
  const selected = modules && modules.length > 0 ? new Set(modules) : null;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const data: Record<string, unknown> = {};
  const counts: Record<string, number> = {};

  for (const entry of BACKUP_ENTRIES) {
    if (selected && !selected.has(entry.module)) continue;
    const rows = await entry.fetch(userId);
    if (rows.length === 0) continue;
    data[entry.key] = rows;
    counts[entry.key] = rows.length;
  }

  return {
    meta: {
      system: "Life OS",
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      modules: selected ? Array.from(selected) : "all",
      counts,
    },
    user: (user as Row | null) ?? null,
    data,
  };
}

// ----------------------------------------------------------------------------
// IMPORT
// ----------------------------------------------------------------------------

// Campos escalares do schema ATUAL por model — backups antigos/futuros podem
// trazer colunas que não existem mais; elas são descartadas em vez de quebrar.
const fieldCache = new Map<string, Set<string> | null>();

function allowedFields(model: string): Set<string> | null {
  const cached = fieldCache.get(model);
  if (cached !== undefined) return cached;
  let result: Set<string> | null = null;
  try {
    const m = Prisma.dmmf.datamodel.models.find((mm) => mm.name === model);
    if (m) {
      result = new Set(
        m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => f.name),
      );
    }
  } catch {
    result = null; // DMMF indisponível → cai no filtro de primitivos
  }
  fieldCache.set(model, result);
  return result;
}

function sanitizeRow(model: string, raw: Row): Row {
  const allowed = allowedFields(model);
  const out: Row = {};
  for (const [key, value] of Object.entries(raw)) {
    if (allowed && !allowed.has(key)) continue;
    // Relações embutidas (objetos/arrays) nunca são colunas escalares.
    if (value !== null && typeof value === "object") continue;
    out[key] = value;
  }
  return out;
}

function isRow(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

/**
 * Importa um backup v3 para o usuário logado. Pressupõe que os dados antigos
 * já foram zerados (wipeUserData) — IDs são preservados e FKs validadas contra
 * o que entrou no próprio arquivo (referências órfãs viram null ou são puladas).
 */
export async function importFullBackup(userId: string, file: FullBackupFile): Promise<ImportSummary> {
  const ctx: ImportContext = { userId, ids: new Map(), remaps: new Map() };
  const imported: Record<string, number> = {};
  const skipped: Record<string, number> = {};

  // ContentTypes existentes no banco continuam válidos como alvo de FK.
  const existingTypes = await prisma.contentType.findMany({ select: { id: true } });
  ctx.ids.set("contentTypes", new Set(existingTypes.map((t) => t.id)));

  for (const entry of BACKUP_ENTRIES) {
    const raw = file.data?.[entry.key];
    if (!Array.isArray(raw) || raw.length === 0) continue;

    const rows = raw.filter(isRow).map((r) => sanitizeRow(entry.model, r));

    if (entry.importSpecial) {
      imported[entry.key] = await entry.importSpecial(rows, ctx);
      continue;
    }
    if (!entry.create) continue;

    const incomingIds = new Set<string>();
    for (const r of rows) {
      if (typeof r.id === "string") incomingIds.add(r.id);
    }

    const insertedIds = new Set<string>();
    const deferredParents: { id: string; parentId: string }[] = [];
    const ready: Row[] = [];
    let skipCount = 0;

    for (const row of rows) {
      const prepared: Row = { ...row, userId };

      // Hierarquia (FK para o próprio model): liga num 2º passo.
      if (entry.selfRef) {
        const parent = prepared[entry.selfRef.field];
        prepared[entry.selfRef.field] = null;
        if (typeof prepared.id === "string" && typeof parent === "string" && incomingIds.has(parent)) {
          deferredParents.push({ id: prepared.id, parentId: parent });
        }
      }

      // FKs para outros models: remapeia (taxonomias) e valida existência.
      let skip = false;
      for (const fk of entry.fks ?? []) {
        const value = prepared[fk.field];
        if (value == null) continue;
        if (typeof value !== "string") {
          prepared[fk.field] = null;
          continue;
        }
        const mapped = ctx.remaps.get(fk.target)?.get(value) ?? value;
        if (ctx.ids.get(fk.target)?.has(mapped)) {
          prepared[fk.field] = mapped;
        } else if (fk.required) {
          skip = true;
          break;
        } else {
          prepared[fk.field] = null;
        }
      }
      if (skip) {
        skipCount++;
        continue;
      }
      ready.push(prepared);
    }

    let okCount = 0;
    for (const part of chunk(ready, 100)) {
      try {
        await entry.create(part, userId);
        okCount += part.length;
        for (const r of part) if (typeof r.id === "string") insertedIds.add(r.id);
      } catch {
        // Lote falhou (ex.: colisão de unique) → tenta linha a linha.
        for (const row of part) {
          try {
            await entry.create([row], userId);
            okCount++;
            if (typeof row.id === "string") insertedIds.add(row.id);
          } catch (rowError) {
            if (entry.mutateOnRetry) {
              try {
                const retried = entry.mutateOnRetry(row);
                await entry.create([retried], userId);
                okCount++;
                if (typeof retried.id === "string") insertedIds.add(retried.id);
                continue;
              } catch {
                // cai no skip abaixo
              }
            }
            console.warn(`[backup] linha pulada em ${entry.key}:`, rowError);
            skipCount++;
          }
        }
      }
    }

    // 2º passo da hierarquia (pais já existem).
    if (entry.selfRef) {
      for (const link of deferredParents) {
        if (!insertedIds.has(link.id) || !insertedIds.has(link.parentId)) continue;
        await entry.selfRef.update(link.id, link.parentId, userId);
      }
    }

    ctx.ids.set(entry.key, insertedIds);
    if (okCount > 0) imported[entry.key] = okCount;
    if (skipCount > 0) skipped[entry.key] = skipCount;
  }

  const total = Object.values(imported).reduce((sum, n) => sum + n, 0);
  return { imported, skipped, total };
}

// ----------------------------------------------------------------------------
// WIPE — apaga TODOS os dados do usuário (filho→pai). Preferências (Settings,
// UserStats) são mantidas; ContentType é taxonomia global e nunca é apagada.
// ----------------------------------------------------------------------------

export async function wipeUserData(userId: string): Promise<void> {
  const reversed = [...BACKUP_ENTRIES].reverse();
  for (const entry of reversed) {
    if (WIPE_KEEP.has(entry.key)) continue;
    if (!entry.wipe) continue;
    await entry.wipe(userId);
  }
}

// ----------------------------------------------------------------------------
// VALIDAÇÃO (dry-run) — lê o arquivo e devolve contagens SEM importar nada.
// ----------------------------------------------------------------------------

export interface BackupSummary {
  valid: boolean;
  legacy: boolean;
  schemaVersion: number;
  exportedAt: string | null;
  counts: { key: string; label: string; count: number }[];
  total: number;
  message?: string;
}

const ENTRY_LABELS: Record<string, string> = Object.fromEntries(
  BACKUP_ENTRIES.map((e) => [e.key, e.key]),
);

export function summarizeBackup(parsed: unknown): BackupSummary {
  if (!isRow(parsed)) {
    return { valid: false, legacy: false, schemaVersion: 0, exportedAt: null, counts: [], total: 0, message: "Arquivo não é um JSON de backup." };
  }
  const meta = isRow(parsed.meta) ? parsed.meta : null;
  if (!meta || meta.system !== "Life OS") {
    return { valid: false, legacy: false, schemaVersion: 0, exportedAt: null, counts: [], total: 0, message: "Este arquivo não é um backup do Life OS." };
  }

  const schemaVersion = typeof meta.schemaVersion === "number" ? meta.schemaVersion : 0;
  const exportedAt =
    typeof meta.exportedAt === "string" ? meta.exportedAt : typeof meta.date === "string" ? meta.date : null;

  const counts: { key: string; label: string; count: number }[] = [];
  let total = 0;

  if (schemaVersion >= 3 && isRow(parsed.data)) {
    for (const [key, value] of Object.entries(parsed.data)) {
      if (!Array.isArray(value) || value.length === 0) continue;
      counts.push({ key, label: ENTRY_LABELS[key] ?? key, count: value.length });
      total += value.length;
    }
    return { valid: true, legacy: false, schemaVersion, exportedAt, counts, total };
  }

  // Formato legado (v2): arrays soltos na raiz, alguns aninhados.
  for (const [key, value] of Object.entries(parsed)) {
    if (key === "meta" || key === "user") continue;
    if (Array.isArray(value) && value.length > 0) {
      counts.push({ key, label: key, count: value.length });
      total += value.length;
    }
  }
  return { valid: true, legacy: true, schemaVersion: schemaVersion || 2, exportedAt, counts, total };
}
