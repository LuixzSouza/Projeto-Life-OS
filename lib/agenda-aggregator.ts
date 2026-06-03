// Agregador da Agenda unificada: junta TODOS os registros datados do sistema
// (eventos, refeições, treinos, estudos, sono, corpo, mídia, closet, conexões,
// aniversários, finanças, vagas, tarefas, desafios, reuniões) num único feed.
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { CATEGORY_META, type AgendaItem, type AgendaSource } from "@/components/agenda/agenda-shared";

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

// Origens que representam um "momento" do dia (mostram horário).
const TIMED: Set<AgendaSource> = new Set(["event", "meal", "workout", "study", "challenge", "meeting"]);

const MEDIA_STATUS: Record<string, string> = {
  PLAN_TO_WATCH: "Quero ver",
  WATCHING: "Assistindo",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  WATCHED: "Assistido",
  DROPPED: "Abandonado",
  ON_HOLD: "Pausado",
};

function push(items: AgendaItem[], source: AgendaSource, id: string, date: Date, data: Partial<AgendaItem>) {
  items.push({
    id: `${source}-${id}`,
    source,
    title: data.title ?? "",
    subtitle: data.subtitle,
    meta: data.meta,
    date: date.toISOString(),
    time: TIMED.has(source) ? hhmm(date) : null,
    color: data.color ?? CATEGORY_META[source].color,
  });
}

/** Busca e normaliza tudo que tem data dentro do intervalo informado. */
export async function getAgendaItems(rangeStart: Date, rangeEnd: Date): Promise<AgendaItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const range = { gte: rangeStart, lte: rangeEnd };

  const [
    events, meals, workouts, sessions, sleeps, bodies, media, wardrobe,
    friends, transactions, jobs, tasks, checkins, meetings, invoices,
    followUps, recurringExpenses, flashcards,
  ] = await Promise.all([
    prisma.event.findMany({ where: { userId, startTime: range } }),
    prisma.meal.findMany({ where: { userId, date: range } }),
    prisma.workout.findMany({ where: { userId, date: range } }),
    prisma.studySession.findMany({ where: { userId, date: range }, include: { subject: { select: { title: true } } } }),
    prisma.healthMetric.findMany({ where: { userId, type: "SLEEP", date: range } }),
    prisma.bodyMeasurement.findMany({ where: { userId, date: range } }),
    prisma.mediaItem.findMany({ where: { userId, updatedAt: range } }),
    prisma.wardrobeItem.findMany({ where: { userId, lastWorn: range } }),
    prisma.friend.findMany({ where: { userId } }), // aniversários precisam de todos
    prisma.transaction.findMany({ where: { userId, date: range } }),
    prisma.jobApplication.findMany({ where: { userId, appliedDate: range } }),
    prisma.task.findMany({ where: { userId, dueDate: range, deletedAt: null } }),
    prisma.challengeCheckin.findMany({ where: { userId, date: range }, include: { challenge: { select: { title: true } } } }),
    prisma.meeting.findMany({ where: { userId, createdAt: range } }),
    prisma.invoice.findMany({ where: { userId, dueDate: range } }),
    prisma.jobApplication.findMany({ where: { userId, followUpDate: range } }),
    prisma.recurringExpense.findMany({ where: { userId, active: true } }),
    prisma.flashcard.findMany({ where: { userId, nextReview: range }, select: { id: true, nextReview: true } }),
  ]);

  const items: AgendaItem[] = [];

  for (const e of events) {
    push(items, "event", e.id, e.startTime, {
      title: e.title, subtitle: e.location || e.description || undefined, color: e.color || undefined,
    });
  }
  for (const m of meals) {
    push(items, "meal", m.id, m.date, {
      title: m.title, subtitle: m.items || undefined, meta: m.calories ? `${m.calories} kcal` : undefined,
    });
  }
  for (const w of workouts) {
    push(items, "workout", w.id, w.date, {
      title: w.title, subtitle: w.muscleGroup || w.type, meta: w.duration ? `${w.duration} min` : undefined,
    });
  }
  for (const s of sessions) {
    push(items, "study", s.id, s.date, {
      title: s.subject?.title ?? "Estudo", subtitle: "Sessão de estudo",
      meta: s.durationMinutes ? `${s.durationMinutes} min` : undefined,
    });
  }
  for (const s of sleeps) {
    push(items, "sleep", s.id, s.date, {
      title: "Sono", subtitle: "Noite registrada", meta: s.value != null ? `${s.value}h` : undefined,
    });
  }
  for (const b of bodies) {
    push(items, "body", b.id, b.date, { title: "Medição corporal", meta: b.weight ? `${b.weight} kg` : undefined });
  }
  for (const mi of media) {
    push(items, "media", mi.id, mi.updatedAt, {
      title: mi.title, subtitle: MEDIA_STATUS[mi.status] ?? mi.status,
    });
  }
  for (const wi of wardrobe) {
    if (!wi.lastWorn) continue;
    push(items, "wardrobe", wi.id, wi.lastWorn, {
      title: `Usou: ${wi.name}`, subtitle: [wi.brand, wi.category].filter(Boolean).join(" · ") || undefined,
    });
  }

  // Conexões: criação + aniversários recorrentes no intervalo.
  const years = new Set<number>();
  for (let y = rangeStart.getFullYear(); y <= rangeEnd.getFullYear(); y++) years.add(y);
  for (const f of friends) {
    if (f.createdAt >= rangeStart && f.createdAt <= rangeEnd) {
      push(items, "friend", f.id, f.createdAt, { title: `Nova conexão: ${f.name}` });
    }
    if (f.birthday) {
      // Aniversários são gravados como `YYYY-MM-DDT12:00:00Z` (meio-dia UTC).
      // Lemos em UTC para extrair o mesmo dia em qualquer fuso e ficar
      // consistente com a página Social (que usa getUTCMonth).
      const bm = f.birthday.getUTCMonth();
      const bd = f.birthday.getUTCDate();
      for (const y of years) {
        const occ = new Date(y, bm, bd, 0, 0, 0);
        if (occ >= rangeStart && occ <= rangeEnd) {
          push(items, "birthday", `${f.id}-${y}`, occ, { title: `Aniversário de ${f.name}` });
        }
      }
    }
  }

  for (const t of transactions) {
    const amount = Number(t.amount);
    const isIncome = t.type?.toUpperCase() === "INCOME";
    push(items, "finance", t.id, t.date, {
      title: t.description,
      subtitle: t.category,
      meta: `${isIncome ? "+" : "-"} ${brl(Math.abs(amount))}`,
      color: isIncome ? "#16a34a" : "#ef4444",
    });
  }
  for (const j of jobs) {
    push(items, "job", j.id, j.appliedDate, {
      title: `${j.role} · ${j.company}`, subtitle: `Candidatura · ${j.status}`,
    });
  }
  for (const t of tasks) {
    if (!t.dueDate) continue;
    push(items, "task", t.id, t.dueDate, {
      title: t.title, subtitle: t.isDone ? "Concluída" : "Tarefa pendente",
    });
  }
  for (const c of checkins) {
    push(items, "challenge", c.id, c.date, {
      title: `Check-in: ${c.challenge?.title ?? "Desafio"}`, subtitle: c.note || undefined,
    });
  }
  for (const mt of meetings) {
    push(items, "meeting", mt.id, mt.createdAt, { title: mt.title, subtitle: "Reunião" });
  }

  // Cobranças (faturas de Negócios): vencimento no calendário.
  const now = new Date();
  const INVOICE_STATUS: Record<string, string> = {
    PENDING: "A receber", PAID: "Recebida", OVERDUE: "Vencida", CANCELED: "Cancelada",
  };
  for (const inv of invoices) {
    const isPaid = inv.status === "PAID";
    const isLate = !isPaid && inv.status !== "CANCELED" && inv.dueDate < now;
    const label = isLate ? "Vencida" : (INVOICE_STATUS[inv.status] ?? inv.status);
    push(items, "invoice", inv.id, inv.dueDate, {
      title: `Vencimento: ${inv.title}`,
      subtitle: label,
      meta: brl(Number(inv.value)),
      color: isPaid ? "#16a34a" : isLate ? "#ef4444" : undefined,
    });
  }

  // Follow-ups de vagas: aparecem na categoria "Vagas", mas na data de retorno.
  // (id com sufixo para não colidir com a candidatura empurrada por appliedDate.)
  for (const f of followUps) {
    if (!f.followUpDate) continue;
    push(items, "job", `${f.id}-followup`, f.followUpDate, {
      title: `Follow-up: ${f.role} · ${f.company}`,
      subtitle: `Retornar contato · ${f.status}`,
    });
  }

  // Contas fixas (despesas recorrentes): geram uma ocorrência por mês no intervalo,
  // no dia configurado (limitado ao último dia do mês para fev/30/31).
  const monthsInRange: Array<{ y: number; m: number }> = [];
  {
    let y = rangeStart.getFullYear();
    let m = rangeStart.getMonth();
    const endY = rangeEnd.getFullYear();
    const endM = rangeEnd.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      monthsInRange.push({ y, m });
      m++;
      if (m > 11) { m = 0; y++; }
    }
  }
  for (const r of recurringExpenses) {
    for (const { y, m } of monthsInRange) {
      const lastDay = new Date(y, m + 1, 0).getDate();
      const day = Math.min(r.dayOfMonth, lastDay);
      const occ = new Date(y, m, day, 12, 0, 0);
      if (occ < rangeStart || occ > rangeEnd) continue;
      push(items, "recurring", `${r.id}-${y}-${m}`, occ, {
        title: r.title,
        subtitle: `Conta fixa · ${r.category}`,
        meta: `- ${brl(Number(r.amount))}`,
      });
    }
  }

  // Revisões de flashcards (repetição espaçada): agregadas por dia para não poluir
  // o calendário com centenas de cards. Um item-resumo "Revisar N flashcards".
  const reviewsByDay = new Map<string, number>();
  for (const c of flashcards) {
    if (!c.nextReview) continue;
    const d = c.nextReview;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    reviewsByDay.set(key, (reviewsByDay.get(key) ?? 0) + 1);
  }
  for (const [key, count] of reviewsByDay) {
    const [yy, mm, dd] = key.split("-").map(Number);
    const occ = new Date(yy, mm, dd, 12, 0, 0);
    push(items, "review", key, occ, {
      title: `Revisar ${count} flashcard${count === 1 ? "" : "s"}`,
      subtitle: "Repetição espaçada",
    });
  }

  // Ordena por data/hora crescente.
  items.sort((a, b) => +new Date(a.date) - +new Date(b.date));
  return items;
}
