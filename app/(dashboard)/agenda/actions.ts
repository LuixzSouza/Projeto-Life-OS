"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId, getCurrentUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notifications";
import { FREQUENCIES } from "@/lib/recurrence";

// --- EVENTOS (Agora com suporte a Timeblocking real) ---

/** Campos de recorrência (#2) e dia inteiro (D2) compartilhados por criar/editar. */
function parseEventExtras(formData: FormData) {
  const isAllDay = formData.get("isAllDay") === "on";
  const frequencyRaw = (formData.get("frequency") as string) || "";
  const frequency = (FREQUENCIES as readonly string[]).includes(frequencyRaw) ? frequencyRaw : null;
  const recurrenceEndStr = (formData.get("recurrenceEnd") as string) || "";
  // T12:00:00Z: regra de ouro de <input type="date"> (bug do "dia anterior").
  const recurrenceEnd = frequency && recurrenceEndStr ? new Date(`${recurrenceEndStr}T12:00:00Z`) : null;
  return { isAllDay, frequency, recurrenceEnd };
}

export async function createEvent(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const endTimeStr = formData.get("endTime") as string; // 🟢 NOVO: Hora de fim
  const location = formData.get("location") as string;
  const color = formData.get("color") as string;
  const notification = formData.get("notification") === "on";
  const taskIdRaw = (formData.get("taskId") as string) || ""; // bloco agendado a partir de uma tarefa
  const { isAllDay, frequency, recurrenceEnd } = parseEventExtras(formData);

  if (!title || !dateStr || (!timeStr && !isAllDay)) {
    throw new Error("Preencha os campos obrigatórios (Título, Data e Hora).");
  }

  // Dia inteiro: ancora ao meio-dia local (sem horário visível) e sem hora de fim.
  // Com horário: combina data + hora de início.
  const startTime = isAllDay ? new Date(`${dateStr}T12:00:00`) : new Date(`${dateStr}T${timeStr}:00`);

  // 🟢 NOVO: Combina data e hora de fim (se não enviar, assume +1 hora)
  let endTime: Date | null = new Date(startTime);
  if (isAllDay) {
      endTime = null;
  } else if (endTimeStr) {
      endTime = new Date(`${dateStr}T${endTimeStr}:00`);
      if (endTime <= startTime) throw new Error("A hora final deve ser maior que a inicial.");
  } else {
      endTime.setHours(endTime.getHours() + 1);
  }

  const userId = await requireUserId();

  // Só vincula o bloco à tarefa se ela for do próprio usuário (evita FK inválida).
  let taskId: string | null = null;
  if (taskIdRaw) {
    const task = await prisma.task.findFirst({ where: { id: taskIdRaw, userId }, select: { id: true } });
    taskId = task?.id ?? null;
  }

  const created = await prisma.event.create({
    data: {
      title,
      description: description || null,
      startTime,
      endTime, // 🟢 NOVO (Atualize seu schema.prisma se necessário)
      location: location || null,
      color: color || "#3B82F6", // Default Blue (Google Calendar vibe)
      emailAlert: notification,
      isAllDay,
      frequency,
      recurrenceEnd,
      taskId,
      userId,
    },
  });

  await logActivity({
    action: "CREATE",
    module: "agenda",
    entityType: "event",
    entityId: created.id,
    summary: `Criou o evento "${created.title}"`,
  });

  // Aviso pontual: evento marcado para as próximas 24h. Mesma chave (type/entity)
  // do generateReminders, então não duplica quando os lembretes são gerados depois.
  const msUntil = startTime.getTime() - Date.now();
  if (msUntil > 0 && msUntil <= 24 * 3600 * 1000) {
    await notify({
      type: "EVENT",
      title: `Em breve: ${created.title}`,
      body: created.location ?? undefined,
      entityType: "event",
      entityId: created.id,
      actionUrl: "/agenda",
      dueAt: startTime,
    });
  }

  revalidatePath("/agenda");
}

export async function updateEvent(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const endTimeStr = formData.get("endTime") as string; // 🟢 NOVO
  const location = formData.get("location") as string;
  const color = formData.get("color") as string;
  const notification = formData.get("notification") === "on"; // lembrete local (#12)
  const { isAllDay, frequency, recurrenceEnd } = parseEventExtras(formData);

  if (!id || !title || !dateStr || (!timeStr && !isAllDay)) {
     throw new Error("Dados inválidos.");
  }

  const startTime = isAllDay ? new Date(`${dateStr}T12:00:00`) : new Date(`${dateStr}T${timeStr}:00`);

  let endTime: Date | null = new Date(startTime);
  if (isAllDay) {
      endTime = null;
  } else if (endTimeStr) {
      endTime = new Date(`${dateStr}T${endTimeStr}:00`);
  } else {
      endTime.setHours(endTime.getHours() + 1);
  }

  const userId = await requireUserId();

  // Editar um evento recorrente edita a SÉRIE (a âncora). "Só esta ocorrência"
  // fica para uma próxima rodada (exigiria materializar exceções).
  await prisma.event.updateMany({
    where: { id, userId },
    data: {
      title,
      description: description || null,
      startTime,
      endTime,
      location: location || null,
      color: color || "#3B82F6",
      emailAlert: notification,
      isAllDay,
      frequency,
      recurrenceEnd,
    },
  });

  revalidatePath("/agenda");
}

// Reagendamento por arraste (#3 do AGENDA_ROADMAP): muda SÓ os horários.
// Recebe ISO strings (o arraste já calculou início/fim com snap de 15min).
export async function moveEvent(eventId: string, startISO: string, endISO: string) {
  const userId = await requireUserId();
  const startTime = new Date(startISO);
  const endTime = new Date(endISO);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
    throw new Error("Horário inválido.");
  }
  await prisma.event.updateMany({
    where: { id: eventId, userId, deletedAt: null },
    data: { startTime, endTime },
  });
  revalidatePath("/agenda");
}

// --- "SÓ ESTA OCORRÊNCIA" (exceções de recorrência) ---

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Lê o JSON de exceções defensivamente (campo novo, dados antigos = null). */
function parseExceptions(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.filter((d): d is string => typeof d === "string") : [];
  } catch {
    return [];
  }
}

/** Pula UMA ocorrência da série (a data entra nas exceções; a série continua). */
export async function skipEventOccurrence(eventId: string, dateKey: string): Promise<{ success: boolean; message: string }> {
  if (!DATE_KEY_RE.test(dateKey)) return { success: false, message: "Data inválida." };
  const userId = await requireUserId();
  const event = await prisma.event.findFirst({
    where: { id: eventId, userId, deletedAt: null, frequency: { not: null } },
    select: { title: true, recurrenceExceptions: true },
  });
  if (!event) return { success: false, message: "Evento recorrente não encontrado." };

  const exceptions = new Set(parseExceptions(event.recurrenceExceptions));
  exceptions.add(dateKey);
  await prisma.event.updateMany({
    where: { id: eventId, userId },
    data: { recurrenceExceptions: JSON.stringify([...exceptions]) },
  });

  revalidatePath("/agenda");
  return { success: true, message: `Ocorrência de "${event.title}" pulada — a série continua.` };
}

export interface DetachedOccurrence {
  success: boolean;
  message: string;
  /** Evento independente recém-criado (serializado p/ abrir o diálogo de edição). */
  event?: {
    id: string; title: string; description: string | null;
    startTime: string; endTime: string | null; location: string | null;
    color: string | null; isAllDay: boolean; frequency: string | null; recurrenceEnd: string | null;
    emailAlert: boolean;
  };
}

/**
 * Desvincula UMA ocorrência da série ("editar só esta"): cria um evento
 * independente naquela data (mesmos dados, sem recorrência) e adiciona a data
 * às exceções da âncora. O chamador abre o diálogo de edição do novo evento.
 */
export async function detachEventOccurrence(eventId: string, dateKey: string): Promise<DetachedOccurrence> {
  if (!DATE_KEY_RE.test(dateKey)) return { success: false, message: "Data inválida." };
  const userId = await requireUserId();
  const anchor = await prisma.event.findFirst({
    where: { id: eventId, userId, deletedAt: null, frequency: { not: null } },
  });
  if (!anchor) return { success: false, message: "Evento recorrente não encontrado." };

  // Horário da ocorrência = data pedida + hora da âncora (dia inteiro segue ao meio-dia).
  const [y, m, d] = dateKey.split("-").map(Number);
  const startTime = new Date(y, m - 1, d, anchor.startTime.getHours(), anchor.startTime.getMinutes(), 0, 0);
  const durationMs = anchor.endTime ? anchor.endTime.getTime() - anchor.startTime.getTime() : 3_600_000;
  const endTime = anchor.isAllDay ? null : new Date(startTime.getTime() + durationMs);

  const exceptions = new Set(parseExceptions(anchor.recurrenceExceptions));
  exceptions.add(dateKey);

  // ⚠️ Réplica: leituras já feitas acima; escrita em lote com select {id}.
  const [created] = await prisma.$transaction([
    prisma.event.create({
      data: {
        title: anchor.title,
        description: anchor.description,
        startTime,
        endTime,
        location: anchor.location,
        color: anchor.color,
        isAllDay: anchor.isAllDay,
        emailAlert: anchor.emailAlert,
        userId,
      },
      select: { id: true },
    }),
    prisma.event.updateMany({
      where: { id: eventId, userId },
      data: { recurrenceExceptions: JSON.stringify([...exceptions]) },
    }),
  ]);

  await logActivity({
    action: "CREATE",
    module: "agenda",
    entityType: "event",
    entityId: created.id,
    summary: `Desvinculou a ocorrência de "${anchor.title}" em ${dateKey}`,
  });

  revalidatePath("/agenda");
  return {
    success: true,
    message: "Ocorrência desvinculada — edite à vontade, a série não muda.",
    event: {
      id: created.id,
      title: anchor.title,
      description: anchor.description,
      startTime: startTime.toISOString(),
      endTime: endTime ? endTime.toISOString() : null,
      location: anchor.location,
      color: anchor.color,
      isAllDay: anchor.isAllDay,
      frequency: null,
      recurrenceEnd: null,
      emailAlert: anchor.emailAlert,
    },
  };
}

// Soft-delete: o evento vai para a Lixeira (deletedAt) e some das listagens.
// Restaurar/excluir em definitivo: ver app/(dashboard)/trash.
export async function deleteEvent(eventId: string) {
  const userId = await requireUserId();
  const event = await prisma.event.findFirst({ where: { id: eventId, userId }, select: { title: true } });
  await prisma.event.updateMany({ where: { id: eventId, userId }, data: { deletedAt: new Date() } });

  await logActivity({
    action: "DELETE",
    module: "agenda",
    entityType: "event",
    entityId: eventId,
    summary: event ? `Moveu "${event.title}" para a lixeira` : "Excluiu um evento",
  });

  revalidatePath("/agenda");
}

// --- TAREFAS ---

const TASK_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

// Criação rápida a partir da Agenda: só título é obrigatório; prioridade e data são
// opcionais. Sem projeto (vai para "soltas"); o usuário detalha depois em Projetos.
export async function createQuickTask(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  if (!title) return { success: false, message: "Informe um título." };

  const priorityRaw = (formData.get("priority") as string) || "MEDIUM";
  const priority = (TASK_PRIORITIES as readonly string[]).includes(priorityRaw) ? priorityRaw : "MEDIUM";

  // <input type="date"> ao meio-dia UTC evita o bug do "dia anterior" por fuso.
  const dueStr = (formData.get("dueDate") as string)?.split("T")[0];
  const dueDate = dueStr ? new Date(`${dueStr}T12:00:00Z`) : null;

  const userId = await requireUserId();

  const created = await prisma.task.create({
    data: { title, priority, dueDate, userId },
  });

  await logActivity({
    action: "CREATE",
    module: "projects",
    entityType: "task",
    entityId: created.id,
    summary: `Criou a tarefa "${created.title}"`,
  });

  revalidatePath("/agenda");
  return { success: true, message: "Tarefa criada!" };
}

export async function toggleTaskDone(taskId: string) {
  const userId = await requireUserId();
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { isDone: true },
  });

  if (!task) return;

  await prisma.task.updateMany({
    where: { id: taskId, userId },
    data: { isDone: !task.isDone },
  });

  revalidatePath("/agenda");
}

// --- ROTINAS (Mantido intacto) ---

export async function getRoutineItems() {
  const userId = await getCurrentUserId();
  return await prisma.routineItem.findMany({
    where: { userId },
    orderBy: { startTime: 'asc' }
  });
}

export async function seedRoutine() {
  const userId = await requireUserId();
  const count = await prisma.routineItem.count({ where: { userId } });
  if (count > 0) return { success: false, message: "Rotina já existe!" };

  const routineData = [
    // ... [Seus dados de rotina mantidos exatamente iguais] ...
    { time: "06:30", end: "07:00", title: "Acordar & Hidratação", cat: "health", days: "mon,tue,wed,thu", desc: "1 copo de água + conversa com namorada." },
    { time: "07:00", end: "08:00", title: "Treino Matinal", cat: "health", days: "mon,tue,wed,thu", desc: "Academia, corrida ou musculação." },
    { time: "08:15", end: "08:45", title: "Café da Manhã", cat: "health", days: "mon,tue,wed,thu", desc: "Frutas, ovos, pão integral." },
    { time: "09:00", end: "11:30", title: "Estudo Front-end (Foco)", cat: "study", days: "mon,tue,wed,thu", desc: "Pomodoro 25/5. Projetos práticos." },
    { time: "12:00", end: "12:30", title: "Almoço", cat: "health", days: "mon,tue,wed,thu", desc: "Refeição equilibrada." },
    { time: "12:30", end: "14:00", title: "Estudo + Duolingo", cat: "study", days: "mon,tue,wed,thu", desc: "Revisão de código e inglês." },
    { time: "17:30", end: "22:00", title: "Faculdade (S.I.)", cat: "work", days: "mon,tue,wed,thu", desc: "Aulas presenciais. Foco total." },
    { time: "23:40", end: "00:00", title: "Leitura & Meditação", cat: "health", days: "mon,tue,wed,thu", desc: "Bíblia e respiração." },
    { time: "09:00", end: "12:00", title: "Faxina Geral", cat: "home", days: "fri", desc: "Zerar a bagunça da semana." },
    { time: "12:30", end: "15:00", title: "Estudos / Portfólio", cat: "study", days: "fri", desc: "Foco na criação do portfólio." },
    { time: "15:15", end: "17:00", title: "Inglês & Revisão", cat: "study", days: "fri", desc: "Duolingo e revisão da semana." },
    { time: "21:00", end: "21:30", title: "Planejamento Semanal", cat: "work", days: "fri", desc: "Organizar agenda da próxima semana." },
    { time: "09:00", end: "12:00", title: "Tarefas Leves", cat: "home", days: "sat", desc: "Organizar mochila, plantas, caminhada." },
    { time: "14:00", end: "17:00", title: "Visita Namorada", cat: "leisure", days: "sat", desc: "Tempo de qualidade." },
    { time: "09:00", end: "11:00", title: "Atividade Leve", cat: "health", days: "sun", desc: "Caminhada ou bicicleta." },
    { time: "13:00", end: "15:00", title: "Revisão & Planejamento", cat: "work", days: "sun", desc: "Ajustar planos e metas." },
  ];

  await prisma.routineItem.createMany({
    data: routineData.map(item => ({
        title: item.title,
        startTime: item.time,
        endTime: item.end,
        category: item.cat,
        daysOfWeek: item.days,
        description: item.desc,
        userId
    }))
  });

  revalidatePath("/agenda");
  return { success: true, message: "Rotina importada com sucesso!" };
}

export async function createRoutineItem(formData: FormData) {
  const title = formData.get("title") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const daysOfWeek = formData.get("daysOfWeek") as string;

  const userId = await requireUserId();

  await prisma.routineItem.create({
    data: { title, startTime, endTime, description, category, daysOfWeek, userId }
  });
  revalidatePath("/agenda");
}

export async function updateRoutineItem(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string;
  const description = formData.get("description") as string;
  const category = formData.get("category") as string;
  const daysOfWeek = formData.get("daysOfWeek") as string;

  const userId = await requireUserId();

  await prisma.routineItem.updateMany({
    where: { id, userId },
    data: { title, startTime, endTime, description, category, daysOfWeek }
  });
  revalidatePath("/agenda");
}

export async function deleteRoutineItem(id: string) {
  const userId = await requireUserId();
  await prisma.routineItem.deleteMany({ where: { id, userId } });
  revalidatePath("/agenda");
}

export async function resetRoutine() {
  const userId = await requireUserId();
  await prisma.routineItem.deleteMany({ where: { userId } });
  revalidatePath("/agenda");
}

// --- LIMPEZA PROGRAMADA (Fase 1 — #3) ---

const VALID_DAY_IDS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export interface CleaningRotationInput {
  /** Cômodos/áreas na ordem desejada (ex.: ["Cozinha", "Banheiro"]). */
  rooms: string[];
  /** Dias da semana do rodízio (ids: mon, tue, …). */
  days: string[];
  /** Horário do bloco (HH:mm). */
  startTime: string;
  /** Duração em minutos (default 30). */
  durationMinutes?: number;
}

/**
 * Gera o rodízio de limpeza: distribui os cômodos em round-robin pelos dias
 * escolhidos e cria UM bloco fixo de rotina por cômodo (categoria "home").
 * Com mais cômodos que dias, o dia recebe mais de um cômodo no mesmo bloco.
 */
export async function seedCleaningRotation(input: CleaningRotationInput) {
  const userId = await requireUserId();

  const rooms = input.rooms.map((r) => r.trim()).filter(Boolean).slice(0, 20);
  const days = input.days.filter((d): d is (typeof VALID_DAY_IDS)[number] =>
    (VALID_DAY_IDS as readonly string[]).includes(d),
  );
  if (rooms.length === 0) return { success: false, message: "Liste pelo menos um cômodo." };
  if (days.length === 0) return { success: false, message: "Escolha pelo menos um dia." };
  if (!/^\d{2}:\d{2}$/.test(input.startTime)) return { success: false, message: "Horário inválido." };

  const duration = Math.min(Math.max(input.durationMinutes ?? 30, 10), 240);
  const [h, m] = input.startTime.split(":").map(Number);
  const endMinutes = (h * 60 + m + duration) % (24 * 60);
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

  // Round-robin: cômodo i → dia (i % days.length). Agrupa por dia p/ 1 bloco/dia.
  const roomsByDay = new Map<string, string[]>();
  rooms.forEach((room, i) => {
    const day = days[i % days.length];
    roomsByDay.set(day, [...(roomsByDay.get(day) ?? []), room]);
  });

  await prisma.routineItem.createMany({
    data: [...roomsByDay.entries()].map(([day, dayRooms]) => ({
      title: `🧹 Limpeza: ${dayRooms.join(" + ")}`,
      startTime: input.startTime,
      endTime,
      category: "home",
      daysOfWeek: day,
      description: "Rodízio da Limpeza Programada — um pedaço da casa por dia, sem faxina-monstro.",
      userId,
    })),
  });

  revalidatePath("/agenda");
  return { success: true, message: `Rodízio criado: ${rooms.length} cômodo(s) em ${roomsByDay.size} dia(s).` };
}