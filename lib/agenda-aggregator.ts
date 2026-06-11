// Agregador da Agenda unificada: junta TODOS os registros datados do sistema
// (eventos, refeições, treinos, estudos, sono, corpo, mídia, closet, conexões,
// aniversários, finanças, vagas, tarefas, desafios, reuniões) num único feed.
// Módulo server-only SEM "use server": só Server Components e route handlers o
// importam — assim o feed iCal pode passar o userId resolvido por token, sem
// expor uma server action que aceitaria userId arbitrário do cliente.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { CATEGORY_META, type AgendaItem, type AgendaSource } from "@/components/agenda/agenda-shared";
import { getHolidaysInRange } from "@/lib/holidays";
import { deriveAnchor, asFrequency, occurrencesInRange, FREQUENCY_LABEL } from "@/lib/recurrence";

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
    // `time: null` explícito vence o padrão (evento "dia inteiro" — D2).
    time: data.time !== undefined ? data.time : TIMED.has(source) ? hhmm(date) : null,
    color: data.color ?? CATEGORY_META[source].color,
  });
}

/**
 * Teto defensivo por fonte (D3 do AGENDA_ROADMAP): a janela de 6 semanas não
 * pode virar milhares de linhas serializadas (pior no modo réplica/nuvem).
 * Com take + orderBy o corte é determinístico (os primeiros do período).
 */
const SOURCE_CAP = 600;

/**
 * Busca e normaliza tudo que tem data dentro do intervalo informado.
 * `forUserId` é para chamadas SEM sessão (feed iCal autenticado por token);
 * o padrão continua sendo o usuário logado via cookie.
 */
export async function getAgendaItems(rangeStart: Date, rangeEnd: Date, forUserId?: string): Promise<AgendaItem[]> {
  const userId = forUserId ?? (await getCurrentUserId());
  if (!userId) return [];

  const range = { gte: rangeStart, lte: rangeEnd };

  // `select` enxuto em TODAS as fontes: só os campos que o feed realmente usa
  // (sem select, cada findMany arrasta a linha inteira — notas, base64 etc.).
  const [
    events, recurringEvents, meals, workouts, sessions, sleeps, bodies, media, wardrobe,
    friends, transactions, jobs, tasks, checkins, meetings, invoices,
    followUps, recurringExpenses, recurringCharges, flashcards, goals,
  ] = await Promise.all([
    prisma.event.findMany({
      where: { userId, startTime: range, deletedAt: null },
      select: {
        id: true, title: true, startTime: true, location: true, description: true,
        color: true, isAllDay: true, frequency: true, recurrenceExceptions: true,
      },
      orderBy: { startTime: "asc" }, take: SOURCE_CAP,
    }),
    // Eventos recorrentes (#2): a âncora pode estar ANTES da janela — busca à
    // parte, expandida em ocorrências virtuais pelo motor de lib/recurrence.ts.
    prisma.event.findMany({
      where: { userId, deletedAt: null, frequency: { not: null }, startTime: { lte: rangeEnd } },
      select: {
        id: true, title: true, startTime: true, location: true, description: true,
        color: true, isAllDay: true, frequency: true, recurrenceEnd: true,
        recurrenceExceptions: true,
      },
      orderBy: { startTime: "asc" }, take: SOURCE_CAP,
    }),
    prisma.meal.findMany({
      where: { userId, date: range },
      select: { id: true, title: true, date: true, items: true, calories: true },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.workout.findMany({
      where: { userId, date: range },
      select: { id: true, title: true, date: true, muscleGroup: true, type: true, duration: true },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.studySession.findMany({
      where: { userId, date: range },
      select: { id: true, date: true, durationMinutes: true, subject: { select: { title: true } } },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.healthMetric.findMany({
      where: { userId, type: "SLEEP", date: range },
      select: { id: true, date: true, value: true },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.bodyMeasurement.findMany({
      where: { userId, date: range },
      select: { id: true, date: true, weight: true },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.mediaItem.findMany({
      where: { userId, updatedAt: range, deletedAt: null },
      select: { id: true, title: true, updatedAt: true, status: true },
      orderBy: { updatedAt: "asc" }, take: SOURCE_CAP,
    }),
    prisma.wardrobeItem.findMany({
      where: { userId, lastWorn: range, deletedAt: null },
      select: { id: true, name: true, lastWorn: true, brand: true, category: true },
      orderBy: { lastWorn: "asc" }, take: SOURCE_CAP,
    }),
    // Aniversários precisam de TODAS as conexões — mas só 4 campos delas.
    prisma.friend.findMany({
      where: { userId, deletedAt: null },
      select: { id: true, name: true, birthday: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: range, deletedAt: null },
      select: { id: true, description: true, category: true, date: true, amount: true, type: true },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.jobApplication.findMany({
      where: { userId, appliedDate: range },
      select: { id: true, role: true, company: true, appliedDate: true, status: true },
      orderBy: { appliedDate: "asc" }, take: SOURCE_CAP,
    }),
    prisma.task.findMany({
      where: { userId, dueDate: range, deletedAt: null },
      select: { id: true, title: true, dueDate: true, isDone: true },
      orderBy: { dueDate: "asc" }, take: SOURCE_CAP,
    }),
    prisma.challengeCheckin.findMany({
      where: { userId, date: range },
      select: { id: true, date: true, note: true, challenge: { select: { title: true } } },
      orderBy: { date: "asc" }, take: SOURCE_CAP,
    }),
    prisma.meeting.findMany({
      where: { userId, createdAt: range },
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "asc" }, take: SOURCE_CAP,
    }),
    prisma.invoice.findMany({
      where: { userId, dueDate: range },
      select: { id: true, title: true, dueDate: true, status: true, value: true, billingId: true },
      orderBy: { dueDate: "asc" }, take: SOURCE_CAP,
    }),
    prisma.jobApplication.findMany({
      where: { userId, followUpDate: range },
      select: { id: true, role: true, company: true, followUpDate: true, status: true },
      orderBy: { followUpDate: "asc" }, take: SOURCE_CAP,
    }),
    prisma.recurringExpense.findMany({
      where: { userId, active: true },
      select: {
        id: true, title: true, amount: true, category: true, frequency: true,
        startDate: true, endDate: true, dayOfMonth: true, createdAt: true,
      },
    }),
    prisma.recurringCharge.findMany({
      where: { userId, active: true },
      select: {
        id: true, title: true, amount: true, category: true, clientName: true, billingId: true,
        frequency: true, startDate: true, endDate: true, dayOfMonth: true, createdAt: true,
      },
    }),
    prisma.flashcard.findMany({ where: { userId, nextReview: range }, select: { id: true, nextReview: true } }),
    prisma.learningGoal.findMany({
      where: { userId, targetDate: range, deletedAt: null },
      select: { id: true, title: true, targetDate: true, status: true, subject: { select: { title: true } } },
      orderBy: { targetDate: "asc" }, take: SOURCE_CAP,
    }),
  ]);

  const items: AgendaItem[] = [];

  // "Só esta ocorrência": datas em recurrenceExceptions (JSON) não entram no feed.
  const exceptionKeys = (raw: string | null): Set<string> => {
    if (!raw) return new Set();
    try {
      const arr = JSON.parse(raw) as unknown;
      return new Set(Array.isArray(arr) ? arr.filter((d): d is string => typeof d === "string") : []);
    } catch {
      return new Set();
    }
  };
  const dkey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  for (const e of events) {
    // Âncora recorrente cuja PRÓPRIA data foi pulada não aparece.
    if (e.frequency && exceptionKeys(e.recurrenceExceptions).has(dkey(e.startTime))) continue;
    push(items, "event", e.id, e.startTime, {
      title: e.title, subtitle: e.location || e.description || undefined, color: e.color || undefined,
      ...(e.isAllDay ? { time: null } : {}),
    });
  }

  // Ocorrências virtuais dos eventos recorrentes (#2). A âncora em si já entra
  // pela query principal quando cai na janela — aqui só as repetições. O id
  // ganha sufixo "-r-…": a UI oferece "editar/pular só esta" via exceções
  // (editar a série = editar o evento âncora).
  for (const e of recurringEvents) {
    const freq = asFrequency(e.frequency);
    const exceptions = exceptionKeys(e.recurrenceExceptions);
    const occs = occurrencesInRange({
      anchor: e.startTime, frequency: freq, endDate: e.recurrenceEnd, rangeStart, rangeEnd,
    });
    for (const occ of occs) {
      // Mesma data da âncora? Já está no feed pela query principal.
      if (occ.getFullYear() === e.startTime.getFullYear() && occ.getMonth() === e.startTime.getMonth() && occ.getDate() === e.startTime.getDate()) continue;
      // O motor mensal devolve meio-dia — restaura o horário da âncora.
      const at = new Date(occ);
      at.setHours(e.startTime.getHours(), e.startTime.getMinutes(), 0, 0);
      if (exceptions.has(dkey(at))) continue; // pulada/desvinculada
      push(items, "event", `${e.id}-r-${at.getFullYear()}-${at.getMonth()}-${at.getDate()}`, at, {
        title: e.title,
        subtitle: [FREQUENCY_LABEL[freq], e.location || e.description || ""].filter(Boolean).join(" · "),
        color: e.color || undefined,
        ...(e.isAllDay ? { time: null } : {}),
      });
    }
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

  // Prazos de PROJETO (dueDate próprio do Project — countdown também no card).
  const projectDeadlines = await prisma.project.findMany({
    where: { userId, deletedAt: null, dueDate: range, status: { notIn: ["COMPLETED", "TEMPLATE"] } },
    select: { id: true, title: true, dueDate: true, color: true },
    orderBy: { dueDate: "asc" }, take: SOURCE_CAP,
  });
  for (const p of projectDeadlines) {
    if (!p.dueDate) continue;
    push(items, "task", `project-due-${p.id}`, p.dueDate, {
      title: `Prazo: ${p.title}`, subtitle: "Prazo do projeto", time: null,
      color: p.color || undefined,
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

  // Contas fixas (despesas recorrentes): ocorrências conforme a frequência (semanal/mensal/
  // trimestral/semestral/anual), a partir da âncora e respeitando o endDate.
  for (const r of recurringExpenses) {
    const freq = asFrequency(r.frequency);
    const occs = occurrencesInRange({ anchor: deriveAnchor(r), frequency: freq, endDate: r.endDate, rangeStart, rangeEnd });
    for (const occ of occs) {
      const key = `${r.id}-${occ.getFullYear()}-${occ.getMonth()}-${occ.getDate()}`;
      push(items, "recurring", key, occ, {
        title: r.title,
        subtitle: `Conta fixa · ${FREQUENCY_LABEL[freq]} · ${r.category}`,
        meta: `- ${brl(Number(r.amount))}`,
      });
    }
  }

  // Cobranças recorrentes (receitas a receber): mesma lógica de frequência/encerramento.
  // Dedup: cobranças COM cliente já viram Invoice ("Vencimento: …") quando o mês é
  // materializado; nesses dias mostramos só a fatura. Meses futuros (sem fatura ainda)
  // continuam aparecendo como "Cobrar: …" para dar visibilidade adiantada.
  const invoiceDayByBilling = new Set<string>();
  for (const inv of invoices) {
    if (inv.billingId) {
      const d = inv.dueDate;
      invoiceDayByBilling.add(`${inv.billingId}:${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }
  for (const c of recurringCharges) {
    const freq = asFrequency(c.frequency);
    const occs = occurrencesInRange({ anchor: deriveAnchor(c), frequency: freq, endDate: c.endDate, rangeStart, rangeEnd });
    for (const occ of occs) {
      if (c.billingId && invoiceDayByBilling.has(`${c.billingId}:${occ.getFullYear()}-${occ.getMonth()}-${occ.getDate()}`)) continue;
      const key = `${c.id}-${occ.getFullYear()}-${occ.getMonth()}-${occ.getDate()}`;
      push(items, "charge", key, occ, {
        title: `Cobrar: ${c.title}`,
        subtitle: [c.clientName, c.category, FREQUENCY_LABEL[freq]].filter(Boolean).join(" · "),
        meta: `+ ${brl(Number(c.amount))}`,
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

  // Metas de aprendizado: prazo (targetDate) cai no calendário como dia inteiro.
  for (const g of goals) {
    if (!g.targetDate) continue;
    const isDone = g.status === "DONE";
    push(items, "goal", g.id, g.targetDate, {
      title: `Meta: ${g.title}`,
      subtitle: [isDone ? "Concluída" : "Prazo", g.subject?.title].filter(Boolean).join(" · "),
      color: isDone ? "#16a34a" : undefined,
    });
  }

  // Feriados nacionais: estáticos (local-first, não vêm do banco). Itens read-only
  // de dia inteiro — não têm userId nem podem ser editados/excluídos.
  for (const h of getHolidaysInRange(rangeStart, rangeEnd)) {
    const key = `${h.date.getFullYear()}-${h.date.getMonth()}-${h.date.getDate()}`;
    push(items, "holiday", key, h.date, {
      title: h.name,
      subtitle: h.type === "national" ? "Feriado nacional" : "Ponto facultativo",
    });
  }

  // Ordena por data/hora crescente.
  items.sort((a, b) => +new Date(a.date) - +new Date(b.date));
  return items;
}
