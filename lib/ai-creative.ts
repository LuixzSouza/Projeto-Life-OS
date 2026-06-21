// Conhecimento, criatividade & gamificação (Tiers 4C/4F do roadmap de IA):
// - generateFlashcards (#22): StudyNote → cards no FlashcardDeck (modelos já existem).
// - expertCouncil (#23): a MESMA pergunta por 3 personas (consultor financeiro,
//   minimalista, entusiasta) com dados REAIS — o modelo principal sintetiza.
// - curateMedia (#24): catálogo + energia/humor do dia em UMA chamada para a
//   IA sugerir o que assistir hoje.

import { prisma } from "@/lib/prisma";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

/* ============================================================================
   #22 — GERADOR DE FLASHCARDS
   ============================================================================ */

const FLASHCARD_SYSTEM =
  "Você gera flashcards de estudo. A partir do conteúdo fornecido (um tema, um texto E/OU uma imagem), devolva APENAS um array JSON " +
  '(sem cercas) de no máximo N cards: [{"term":"pergunta/conceito curto","definition":"resposta objetiva"}]. ' +
  "Quando houver imagem (foto de quadro, página, anotação), leia o conteúdo dela e gere cards sobre o que ela ensina. " +
  "Cards devem testar entendimento (não cópia literal), em PT-BR, curtos e autossuficientes.";

interface RawCard { term?: unknown; definition?: unknown }

export interface AiCardsResult {
  cards?: { term: string; definition: string }[];
  erro?: string;
}

/**
 * Núcleo reutilizável: pede à IA e devolve cards já validados (ou um erro).
 * Serve tanto para `generateFlashcards` (a partir de uma nota) quanto para a
 * geração direta num baralho a partir de um tema/texto colado
 * (app/(dashboard)/flashcards/actions.ts > generateDeckCardsWithAi). Não toca o
 * banco — quem chama decide onde gravar.
 */
export async function aiCardsFromText(
  userId: string,
  title: string,
  source: string,
  count = 8,
  images: string[] = [],
): Promise<AiCardsResult> {
  const n = Math.min(Math.max(Math.floor(count), 3), 15);
  const plain = source.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  // Com imagem, o texto é opcional (a foto é a fonte). Sem imagem, exige texto.
  if (plain.length < 12 && images.length === 0) {
    return { erro: "Conteúdo curto demais para gerar flashcards." };
  }

  const userMessage = images.length
    ? `Tema/Contexto "${title}".${plain ? `\n\nTexto:\n${plain}` : ""}\n\nGere os flashcards a partir da(s) imagem(ns) anexada(s)${plain ? " e do texto acima" : ""}.`
    : `Tema/Conteúdo "${title}":\n\n${plain}`;

  const raw = await runOneShotAi(userId, FLASHCARD_SYSTEM.replace("N", String(n)), userMessage, images);
  if (!raw) return { erro: "A IA não está conectada — flashcards automáticos precisam dela. Configure em Configurações → IA." };

  try {
    const fenced = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const match = fenced.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : fenced) as RawCard[];
    const cards = parsed
      .filter((c): c is { term: string; definition: string } => typeof c.term === "string" && typeof c.definition === "string" && !!c.term.trim() && !!c.definition.trim())
      .slice(0, n)
      .map((c) => ({ term: c.term.trim().slice(0, 300), definition: c.definition.trim().slice(0, 600) }));
    return { cards };
  } catch {
    return { erro: "A IA respondeu num formato inesperado. Tente de novo." };
  }
}

export async function generateFlashcards(userId: string, noteId: string, count = 8): Promise<Record<string, unknown>> {
  const note = await prisma.studyNote.findFirst({
    where: { id: noteId, userId },
    select: { id: true, title: true, content: true, notebook: { select: { name: true } } },
  });
  if (!note) return { erro: `Nota ${noteId} não encontrada. Busque a nota com query_system_data (STUDIES) antes.` };

  const plain = note.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
  if (plain.length < 40) return { erro: "A nota é curta demais para gerar flashcards." };

  const result = await aiCardsFromText(userId, note.title, plain, count);
  if (result.erro) return { erro: result.erro };
  const cards = result.cards ?? [];
  if (cards.length === 0) return { erro: "Nenhum card aproveitável foi gerado. Tente uma nota com mais conteúdo." };

  // Reusa o deck da nota (mesmo título) ou cria um novo.
  const deckTitle = `Nota: ${note.title}`.slice(0, 80);
  let deck = await prisma.flashcardDeck.findFirst({ where: { userId, title: deckTitle }, select: { id: true } });
  if (!deck) {
    deck = await prisma.flashcardDeck.create({
      data: { title: deckTitle, description: `Gerado pela IA a partir da nota "${note.title}".`, userId },
      select: { id: true },
    });
  }
  await prisma.$transaction(
    cards.map((c) =>
      prisma.flashcard.create({ data: { term: c.term, definition: c.definition, deckId: deck!.id, userId, nextReview: new Date() }, select: { id: true } })
    )
  );

  return {
    ok: true,
    deck: deckTitle,
    deck_id: deck.id,
    cards_criados: cards.length,
    exemplo: cards[0],
    dica: "Os cards já estão na fila de revisão em /flashcards.",
  };
}

/* ============================================================================
   #23 — CONSELHO DE ESPECIALISTAS (multi-persona com dados reais)
   ============================================================================ */

const PERSONAS: { papel: string; system: string }[] = [
  {
    papel: "Consultor financeiro",
    system: "Você é um consultor financeiro pragmático. Responda à decisão do usuário em ATÉ 4 frases, usando os números reais fornecidos (saldo, gasto médio). Foque em viabilidade e risco financeiro.",
  },
  {
    papel: "Minimalista",
    system: "Você é um minimalista convicto. Em ATÉ 4 frases, questione se o usuário PRECISA disso, o custo de oportunidade e o que poderia simplificar em vez de adquirir/decidir por impulso.",
  },
  {
    papel: "Entusiasta",
    system: "Você é um entusiasta otimista. Em ATÉ 4 frases, defenda o melhor cenário: o ganho de qualidade de vida, e COMO fazer dar certo (não apenas 'sim').",
  },
];

export async function expertCouncil(userId: string, question: string): Promise<Record<string, unknown>> {
  const q = question.trim().slice(0, 500);
  if (!q) return { erro: "Informe a pergunta/decisão." };

  // Contexto financeiro real e compacto para ancorar as personas.
  const monthStart = new Date();
  monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const threeMonthsAgo = new Date(monthStart.getFullYear(), monthStart.getMonth() - 3, 1);
  const [accounts, totals] = await Promise.all([
    prisma.account.findMany({ where: { userId }, select: { balance: true } }),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { userId, deletedAt: null, date: { gte: threeMonthsAgo, lt: monthStart } },
      _sum: { amount: true },
    }),
  ]);
  const saldo = accounts.reduce((a, c) => a + Number(c.balance), 0);
  const income = Number(totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0) / 3;
  const expense = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0) / 3;
  const contexto = `Saldo total: R$ ${saldo.toFixed(2)} · Receita média mensal: R$ ${income.toFixed(2)} · Gasto médio mensal: R$ ${expense.toFixed(2)} (médias dos últimos 3 meses fechados).`;

  const opinions = await Promise.all(
    PERSONAS.map(async (p) => ({
      papel: p.papel,
      opiniao: (await runOneShotAi(userId, `${p.system}\n\n[DADOS REAIS DO USUÁRIO]\n${contexto}`, q)) ?? "(IA indisponível para esta persona)",
    }))
  );

  const ok = opinions.some((o) => !o.opiniao.startsWith("("));
  if (!ok) return { erro: "A IA não está conectada — o conselho precisa dela." };

  return {
    pergunta: q,
    contexto_financeiro: contexto,
    conselho: opinions,
    instrucao: "Sintetize um VEREDITO equilibrado a partir das 3 opiniões acima, citando cada persona em 1 linha e fechando com a sua recomendação prática.",
  };
}

/* ============================================================================
   #24 — CURADOR DE MÍDIA PESSOAL (catálogo × humor/energia do dia)
   ============================================================================ */

/* ============================================================================
   #31 — MESTRE DE JOGO (gamificação narrada com dados REAIS)
   ============================================================================ */

const DAY = 24 * 60 * 60 * 1000;

export async function gameMasterData(userId: string): Promise<Record<string, unknown>> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const d30 = new Date(now.getTime() - 30 * DAY);

  const [stats, challenges, habits, workoutsThis, workoutsPrev, studyWeek, failedLogs] = await Promise.all([
    prisma.userStats.findUnique({ where: { userId }, select: { currentStreak: true, dailyGoalMinutes: true, badges: true } }),
    prisma.challenge.findMany({
      where: { userId, isActive: true },
      select: { title: true, icon: true, durationDays: true, startDate: true, _count: { select: { checkins: true } } },
    }),
    prisma.habit.findMany({
      where: { userId, archived: false },
      select: { name: true, logs: { where: { status: "DONE" }, orderBy: { date: "desc" }, take: 60, select: { date: true } } },
    }),
    prisma.workout.count({ where: { userId, date: { gte: monthStart } } }),
    prisma.workout.count({ where: { userId, date: { gte: prevMonthStart, lt: monthStart } } }),
    prisma.studySession.aggregate({ where: { userId, date: { gte: new Date(now.getTime() - 7 * DAY) } }, _sum: { durationMinutes: true } }),
    prisma.habitLog.groupBy({ by: ["habitId"], where: { userId, status: "FAILED", date: { gte: d30 } }, _count: { _all: true } }),
  ]);

  // Sequência atual de cada hábito (dias consecutivos de DONE até hoje/ontem).
  const dayKeyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const streaks = habits.map((h) => {
    let streak = 0;
    if (h.logs.length > 0) {
      const gap = Math.round((Date.parse(dayKeyOf(now)) - Date.parse(dayKeyOf(h.logs[0].date))) / DAY);
      if (gap <= 1) {
        streak = 1;
        for (let i = 1; i < h.logs.length; i++) {
          const diff = Math.round((h.logs[i - 1].date.getTime() - h.logs[i].date.getTime()) / DAY);
          if (diff === 1) streak++;
          else break;
        }
      }
    }
    return { habito: h.name, sequencia_dias: streak };
  }).sort((a, b) => b.sequencia_dias - a.sequencia_dias);

  const habitNameById = new Map<string, string>();
  // (groupBy devolve habitId; resolve nomes para os pontos fracos)
  const failedIds = failedLogs.map((f) => f.habitId);
  if (failedIds.length > 0) {
    const named = await prisma.habit.findMany({ where: { id: { in: failedIds }, userId }, select: { id: true, name: true } });
    for (const n of named) habitNameById.set(n.id, n.name);
  }

  return {
    perfil: stats ?? { currentStreak: 0, dailyGoalMinutes: 60, badges: null },
    desafios_ativos: challenges.map((c) => ({
      titulo: `${c.icon ?? "🏆"} ${c.title}`,
      progresso: `${c._count.checkins}/${c.durationDays} dias`,
      comecou_em: c.startDate.toISOString().slice(0, 10),
    })),
    sequencias_de_habitos: streaks.slice(0, 5),
    treinos: { mes_atual: workoutsThis, mes_anterior: workoutsPrev },
    estudo_ultimos_7_dias_min: studyWeek._sum.durationMinutes ?? 0,
    pontos_fracos_30_dias: failedLogs
      .map((f) => ({ habito: habitNameById.get(f.habitId) ?? "?", falhas: f._count._all }))
      .sort((a, b) => b.falhas - a.falhas)
      .slice(0, 5),
    instrucao:
      "Você é o MESTRE DE JOGO da vida do usuário. Narre as conquistas com tom épico e PESSOAL (compare com o passado dele: 'o você de 30 dias atrás...'), celebre sequências reais e proponha UM desafio sob medida mirando o ponto fraco mais relevante. Se ele aceitar, crie um hábito (mutate HABITS) ou tarefa correspondente.",
  };
}

export async function curateMedia(userId: string): Promise<Record<string, unknown>> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [checkin, queue, favorites, watching] = await Promise.all([
    prisma.energyCheckin.findFirst({ where: { userId, date: { gte: dayStart } }, select: { energy: true, mood: true, note: true } }),
    prisma.mediaItem.findMany({
      where: { userId, deletedAt: null, status: "PLAN_TO_WATCH" },
      orderBy: { updatedAt: "desc" }, take: 12,
      select: { title: true, type: true, genres: true },
    }),
    prisma.mediaItem.findMany({
      where: { userId, deletedAt: null, rating: { gte: 4 } },
      orderBy: { rating: "desc" }, take: 8,
      select: { title: true, type: true, rating: true, genres: true },
    }),
    prisma.mediaItem.findMany({
      where: { userId, deletedAt: null, status: "WATCHING" },
      take: 5,
      select: { title: true, type: true },
    }),
  ]);

  if (queue.length === 0 && watching.length === 0) {
    return { erro: "O catálogo está vazio (nada em 'Quero ver' nem 'Assistindo'). Sugira adicionar títulos em /entertainment." };
  }

  return {
    estado_do_dia: checkin
      ? { energia: `${checkin.energy}/5`, humor: checkin.mood ? `${checkin.mood}/5` : null, nota: checkin.note }
      : "sem check-in hoje (pergunte como foi o dia antes de sugerir)",
    em_andamento: watching.map((w) => ({ titulo: w.title, tipo: w.type })),
    fila_quero_ver: queue.map((q) => ({ titulo: q.title, tipo: q.type, generos: q.genres })),
    favoritos_5_estrelas: favorites.map((f) => ({ titulo: f.title, tipo: f.type, nota: f.rating, generos: f.genres })),
    instrucao: "Cruze o estado do dia com a fila: dia pesado → algo leve/confortável parecido com os favoritos; energia alta → algo denso da fila. Sugira 1 opção principal + 1 alternativa, explicando o porquê com base nos dados.",
  };
}
