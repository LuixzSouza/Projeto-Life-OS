import { prisma } from "./prisma";

/**
 * Resolve referências polimórficas (`entityType` + `entityId`) em algo exibível:
 * título legível + rota do módulo. Usado pelas centrais de Tags e Anexos para
 * mostrar "o que" cada vínculo aponta, sem cada módulo precisar saber do outro.
 *
 * `entityType` canônico (ver docs/DATABASE.md): task, note, transaction, account,
 * project, event, friend, client, invoice, media, link, flashcardDeck,
 * studySubject, goal, wardrobeItem, workout, meal.
 */

export interface EntityRef {
  entityType: string;
  entityId: string;
}

export interface ResolvedEntity extends EntityRef {
  title: string;
  actionUrl: string | null;
}

// Rota do módulo dono de cada tipo (para o link "abrir").
export const ENTITY_ROUTE: Record<string, string> = {
  task: "/projects",
  note: "/studies",
  transaction: "/finance/transactions",
  account: "/finance",
  project: "/projects",
  event: "/agenda",
  friend: "/social",
  client: "/business",
  invoice: "/business",
  media: "/entertainment",
  link: "/links",
  flashcardDeck: "/flashcards",
  studySubject: "/studies",
  goal: "/studies",
  wardrobeItem: "/wardrobe",
  workout: "/health/gym",
  meal: "/health/nutrition",
};

// Rótulo amigável de cada tipo (PT-BR).
export const ENTITY_LABEL: Record<string, string> = {
  task: "Tarefa",
  note: "Anotação",
  transaction: "Transação",
  account: "Conta",
  project: "Projeto",
  event: "Evento",
  friend: "Conexão",
  client: "Cliente",
  invoice: "Fatura",
  media: "Mídia",
  link: "Link",
  flashcardDeck: "Baralho",
  studySubject: "Matéria",
  goal: "Objetivo",
  wardrobeItem: "Peça",
  workout: "Treino",
  meal: "Refeição",
};

// Busca os títulos de um conjunto de ids do mesmo tipo (escopado ao usuário).
async function fetchTitles(entityType: string, ids: string[], userId: string): Promise<Map<string, string>> {
  const where = { id: { in: ids }, userId };
  const map = new Map<string, string>();
  const put = (rows: { id: string; title: string | null }[]) =>
    rows.forEach((r) => map.set(r.id, r.title?.trim() || "(sem título)"));

  switch (entityType) {
    case "task":
      put(await prisma.task.findMany({ where, select: { id: true, title: true } }));
      break;
    case "note":
      put(await prisma.studyNote.findMany({ where, select: { id: true, title: true } }));
      break;
    case "transaction":
      put((await prisma.transaction.findMany({ where, select: { id: true, description: true } })).map((r) => ({ id: r.id, title: r.description })));
      break;
    case "account":
      put((await prisma.account.findMany({ where, select: { id: true, name: true } })).map((r) => ({ id: r.id, title: r.name })));
      break;
    case "project":
      put(await prisma.project.findMany({ where, select: { id: true, title: true } }));
      break;
    case "event":
      put(await prisma.event.findMany({ where, select: { id: true, title: true } }));
      break;
    case "friend":
      put((await prisma.friend.findMany({ where, select: { id: true, name: true } })).map((r) => ({ id: r.id, title: r.name })));
      break;
    case "client":
      put((await prisma.client.findMany({ where, select: { id: true, name: true } })).map((r) => ({ id: r.id, title: r.name })));
      break;
    case "invoice":
      put(await prisma.invoice.findMany({ where, select: { id: true, title: true } }));
      break;
    case "media":
      put(await prisma.mediaItem.findMany({ where, select: { id: true, title: true } }));
      break;
    case "link":
      put(await prisma.savedLink.findMany({ where, select: { id: true, title: true } }));
      break;
    case "flashcardDeck":
      put(await prisma.flashcardDeck.findMany({ where, select: { id: true, title: true } }));
      break;
    case "studySubject":
      put(await prisma.studySubject.findMany({ where, select: { id: true, title: true } }));
      break;
    case "goal":
      put(await prisma.learningGoal.findMany({ where, select: { id: true, title: true } }));
      break;
    case "wardrobeItem":
      put((await prisma.wardrobeItem.findMany({ where, select: { id: true, name: true } })).map((r) => ({ id: r.id, title: r.name })));
      break;
    case "workout":
      put(await prisma.workout.findMany({ where, select: { id: true, title: true } }));
      break;
    case "meal":
      put(await prisma.meal.findMany({ where, select: { id: true, title: true } }));
      break;
  }
  return map;
}

/**
 * Resolve uma lista de referências em entidades exibíveis. Agrupa por tipo e faz
 * uma query por tipo (evita N+1). Itens não encontrados viram "(removido)".
 */
export async function resolveEntities(refs: EntityRef[], userId: string): Promise<Map<string, ResolvedEntity>> {
  const byType = new Map<string, string[]>();
  for (const r of refs) {
    const arr = byType.get(r.entityType) ?? [];
    arr.push(r.entityId);
    byType.set(r.entityType, arr);
  }

  const out = new Map<string, ResolvedEntity>();
  await Promise.all(
    Array.from(byType.entries()).map(async ([type, ids]) => {
      const titles = await fetchTitles(type, ids, userId);
      for (const id of ids) {
        out.set(`${type}:${id}`, {
          entityType: type,
          entityId: id,
          title: titles.get(id) ?? "(removido)",
          actionUrl: ENTITY_ROUTE[type] ?? null,
        });
      }
    })
  );
  return out;
}
