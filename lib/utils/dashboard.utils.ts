// src/lib/utils/dashboard.utils.ts
import { 
  DashboardBirthday, 
  DashboardInvoice, 
  DashboardStudyResult, 
  ProductivityTrendResult,
  StudyAggregationItem,
  StudySubjectItem,
  PrismaFriend,
  PrismaInvoice
} from "@/components/dashboard/types";
import { getNormalizedToday, parseSafeDate, MS_PER_DAY } from "./date.utils";

/**
 * Retorna a saudação contextualizada com base nas horas locais.
 */
export function getGreeting(): string {
  const hours = new Date().getHours();
  if (hours < 12) return "Bom dia";
  if (hours < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Calcula a margem de retenção financeira.
 * Retorna um valor explícito e limitado. Quando não há receita mas há despesa, 
 * o retorno é limitado a -100% para não quebrar componentes visuais de Gauge/Gráficos.
 */
export function calculateMargin(income: number, expense: number): number {
  if (income > 0) {
    return ((income - expense) / income) * 100;
  }
  if (expense > 0) {
    return -100; 
  }
  return 0;
}

/**
 * Configuração flexível de pesos para o score de produtividade.
 */
interface ProductivityWeights {
  taskWeight: number;
  studyMinuteDivisor: number;
}

const DEFAULT_WEIGHTS: ProductivityWeights = {
  taskWeight: 10,
  studyMinuteDivisor: 3
};

/**
 * Calcula o score de produtividade de forma parametrizável baseado em pesos configuráveis.
 */
export function calculateProductivityScore(
  completedTasks: number, 
  studyMinutes: number,
  weights: ProductivityWeights = DEFAULT_WEIGHTS
): number {
  const rawScore = (completedTasks * weights.taskWeight) + Math.floor(studyMinutes / weights.studyMinuteDivisor);
  const MIN_SCORE = 0;
  const MAX_SCORE = 100;
  return Math.min(Math.max(rawScore, MIN_SCORE), MAX_SCORE);
}

/**
 * Processa e ordena aniversariantes lidando com dados nulos ou datas corrompidas.
 */
export function processUpcomingBirthdays(friends: PrismaFriend[]): DashboardBirthday[] {
  const today = getNormalizedToday();

  return friends
    .map((friend): DashboardBirthday | null => {
      const bday = parseSafeDate(friend.birthday);
      if (!bday) return null;

      // Alinhamento estrito de Timezone utilizando o ano atual de referência
      const nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());

      if (nextBday < today && nextBday.getTime() !== today.getTime()) {
        nextBday.setFullYear(today.getFullYear() + 1);
      }

      const diffDays = Math.ceil((nextBday.getTime() - today.getTime()) / MS_PER_DAY);
      const ageTurning = today.getFullYear() - bday.getFullYear() + (nextBday.getFullYear() > today.getFullYear() ? 1 : 0);

      return {
        id: friend.id,
        name: friend.name,
        imageUrl: friend.imageUrl,
        birthday: bday.toISOString(),
        daysUntil: diffDays,
        ageTurning
      };
    })
    .filter((b): b is DashboardBirthday => b !== null)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 4);
}

/**
 * Formata as faturas protegendo a aplicação contra encadeamentos nulos de billing ou clientes.
 */
export function formatInvoices(rawInvoices: PrismaInvoice[]): DashboardInvoice[] {
  return rawInvoices.map((inv): DashboardInvoice => {
    const rawValue = typeof inv.value === "object" && inv.value !== null && "toNumber" in inv.value 
      ? inv.value.toNumber() 
      : Number(inv.value || 0);

    return {
      id: inv.id,
      title: inv.title,
      value: rawValue,
      dueDate: inv.dueDate,
      status: inv.status,
      clientName: inv.billing?.client?.name ?? "—",
      billingTitle: inv.billing?.title ?? "Cobrança Avulsa",
    };
  });
}

/**
 * Formata os tempos e agregações das sessões de foco por matéria.
 */
export function formatStudyData(studyAgg: StudyAggregationItem[], subjects: StudySubjectItem[]): DashboardStudyResult {
  const totalStudyMinutes = studyAgg.reduce((acc, g) => acc + (g._sum?.durationMinutes ?? 0), 0);
  const totalStudyHours = Math.floor(totalStudyMinutes / 60);

  if (!studyAgg || studyAgg.length === 0) {
    return { studyData: [], totalStudyMinutes: 0, totalStudyHours: 0 };
  }

  const subjectTitleById = new Map<string, string>(subjects.map(s => [s.id, s.title]));
  
  const studyData = studyAgg
    .map(g => ({ 
      name: subjectTitleById.get(g.subjectId) ?? "Sem matéria", 
      value: g._sum?.durationMinutes ?? 0 
    }))
    .filter(d => d.value > 0);

  return { studyData, totalStudyMinutes, totalStudyHours };
}

/**
 * Calcula a variação de tendência comparando o histórico real extraído pelo service.
 */
export function calculateProductivityTrend(currentScore: number, previousScore: number | null): ProductivityTrendResult {
  if (previousScore === null || previousScore === undefined) {
    return { direction: 'flat', text: "Sem histórico comparativo" };
  }
  
  const diff = currentScore - previousScore;
  
  if (diff > 0) {
    return { direction: 'up', text: `+${diff}% vs. período anterior` };
  }
  if (diff < 0) {
    return { direction: 'down', text: `${diff}% vs. período anterior` };
  }
  return { direction: 'flat', text: "Mantendo a média anterior" };
}