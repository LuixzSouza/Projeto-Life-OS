// Sistema de ELO dos Estudos (estilo fila ranqueada de LoL):
// - Estudar rende PDL (1 PDL a cada 2 min, com teto diário — consistência > maratona).
// - Ficar parado DECAI: após 2 dias de carência, perde PDL por dia parado.
//   Como no LoL, elos baixos (Ferro→Prata) NÃO decaem — iniciante não é punido.
// - Tudo é DETERMINÍSTICO a partir do histórico de sessões: nada gravado no banco,
//   nada de cron — recalculado a cada visita, à prova de réplica/fuso.
// Client-safe: funções puras, sem imports de servidor.

export const LP_PER_MINUTE = 0.5;     // 1 PDL a cada 2 minutos de foco
export const DAILY_LP_CAP = 60;       // até 2h/dia contam (anti-farm de madrugada)
export const GRACE_DAYS = 2;          // dias parados "de graça" após o último estudo
export const LP_PER_DIVISION = 100;
export const DIVISIONS_PER_TIER = 4;  // IV, III, II, I

export interface EloTier {
  key: string;
  name: string;
  color: string;       // cor do brasão
  /** PDL perdidos por dia parado (após a carência). 0 = elo protegido. */
  decayPerDay: number;
}

// Escada: 7 tiers com divisões (400 PDL cada) + 3 tiers de elite sem divisão.
export const ELO_TIERS: EloTier[] = [
  { key: "ferro",      name: "Ferro",       color: "#8a8a93", decayPerDay: 0 },
  { key: "bronze",     name: "Bronze",      color: "#b45309", decayPerDay: 0 },
  { key: "prata",      name: "Prata",       color: "#94a3b8", decayPerDay: 0 },
  { key: "ouro",       name: "Ouro",        color: "#f59e0b", decayPerDay: 10 },
  { key: "platina",    name: "Platina",     color: "#14b8a6", decayPerDay: 15 },
  { key: "esmeralda",  name: "Esmeralda",   color: "#10b981", decayPerDay: 20 },
  { key: "diamante",   name: "Diamante",    color: "#38bdf8", decayPerDay: 25 },
  { key: "mestre",     name: "Mestre",      color: "#a855f7", decayPerDay: 35 },
  { key: "graomestre", name: "Grão-Mestre", color: "#ef4444", decayPerDay: 45 },
  { key: "desafiante", name: "Desafiante",  color: "#facc15", decayPerDay: 60 },
];

const TIER_LP = LP_PER_DIVISION * DIVISIONS_PER_TIER; // 400
const DIVISION_TIERS = 7;                              // Ferro..Diamante têm divisões
const MASTER_FLOOR = DIVISION_TIERS * TIER_LP;         // 2800 = entrada do Mestre
const ELITE_STEP = 400;                                // Grão-Mestre 3200+ · Desafiante 3600+

const ROMAN = ["IV", "III", "II", "I"];

export interface DayMinutes {
  /** yyyy-mm-dd (dia local) */
  date: string;
  minutes: number;
}

export interface EloResult {
  lp: number;                 // PDL total acumulado na escada
  tier: EloTier;
  tierIndex: number;
  /** "IV".."I" nos tiers com divisão; null no Mestre+ */
  division: string | null;
  /** PDL dentro da divisão atual (0–99) ou acima do piso no Mestre+ */
  lpInDivision: number;
  /** % até a próxima divisão/tier (Mestre+ usa o próximo degrau de elite). */
  progressPct: number;
  /** Rótulo pronto: "Ouro II · 37 PDL" / "Mestre · 120 PDL" */
  label: string;
  /** PDL ganhos hoje (já com teto aplicado). */
  todayLp: number;
  /** Dias corridos sem estudar (0 = estudou hoje). */
  idleDays: number;
  /** Está decaindo AGORA (parado além da carência num elo que decai)? */
  isDecaying: boolean;
  /** Quanto perde por dia parado no elo atual (0 = protegido). */
  decayPerDay: number;
  /** Dias de carência restantes antes de começar a decair (0 se já decai/protegido). */
  graceLeft: number;
}

function tierAt(lp: number): { tier: EloTier; index: number } {
  if (lp >= MASTER_FLOOR + 2 * ELITE_STEP) return { tier: ELO_TIERS[9], index: 9 };
  if (lp >= MASTER_FLOOR + ELITE_STEP) return { tier: ELO_TIERS[8], index: 8 };
  if (lp >= MASTER_FLOOR) return { tier: ELO_TIERS[7], index: 7 };
  const idx = Math.min(DIVISION_TIERS - 1, Math.floor(lp / TIER_LP));
  return { tier: ELO_TIERS[idx], index: idx };
}

export const dayKeyOf = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Agrupa sessões em minutos por dia local (entrada do computeElo). */
export function sessionsToDays(sessions: { date: Date | string; durationMinutes: number }[]): DayMinutes[] {
  const map = new Map<string, number>();
  for (const s of sessions) {
    const k = dayKeyOf(new Date(s.date));
    map.set(k, (map.get(k) ?? 0) + Math.max(0, s.durationMinutes));
  }
  return [...map.entries()].map(([date, minutes]) => ({ date, minutes })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Reproduz a temporada inteira dia a dia: ganha nos dias estudados (com teto),
 * decai nos dias parados além da carência (conforme o elo DO MOMENTO — cair de
 * tier reduz o decaimento, como rebaixamento de fila).
 */
export function computeElo(days: DayMinutes[], today: Date = new Date()): EloResult {
  const todayKey = dayKeyOf(today);
  const byDay = new Map(days.map((d) => [d.date, d.minutes]));

  let lp = 0;
  let todayLp = 0;
  let idleStreak = 0;

  if (days.length > 0) {
    // Caminha do primeiro dia estudado até hoje, um dia por vez.
    const [y, m, d] = days[0].date.split("-").map(Number);
    const cursor = new Date(y, m - 1, d);
    for (;;) {
      const key = dayKeyOf(cursor);
      const minutes = byDay.get(key) ?? 0;
      if (minutes > 0) {
        const gain = Math.min(DAILY_LP_CAP, Math.round(minutes * LP_PER_MINUTE));
        lp += gain;
        if (key === todayKey) todayLp = gain;
        idleStreak = 0;
      } else {
        idleStreak++;
        if (idleStreak > GRACE_DAYS) {
          lp = Math.max(0, lp - tierAt(lp).tier.decayPerDay);
        }
      }
      if (key === todayKey) break;
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const { tier, index } = tierAt(lp);
  const hasDivisions = index < DIVISION_TIERS;

  let division: string | null = null;
  let lpInDivision: number;
  let progressPct: number;

  if (hasDivisions) {
    const inTier = lp - index * TIER_LP;
    const divIdx = Math.min(DIVISIONS_PER_TIER - 1, Math.floor(inTier / LP_PER_DIVISION));
    division = ROMAN[divIdx];
    lpInDivision = inTier % LP_PER_DIVISION;
    progressPct = Math.round((lpInDivision / LP_PER_DIVISION) * 100);
  } else {
    const floor = MASTER_FLOOR + Math.max(0, index - 7) * ELITE_STEP;
    lpInDivision = lp - floor;
    progressPct = index >= 9 ? 100 : Math.min(100, Math.round((lpInDivision / ELITE_STEP) * 100));
  }

  const isDecaying = idleStreak > GRACE_DAYS && tier.decayPerDay > 0;
  const graceLeft = tier.decayPerDay > 0 && idleStreak > 0 && idleStreak <= GRACE_DAYS
    ? GRACE_DAYS - idleStreak + 1
    : 0;

  return {
    lp,
    tier,
    tierIndex: index,
    division,
    lpInDivision,
    progressPct,
    label: `${tier.name}${division ? ` ${division}` : ""} · ${lpInDivision} PDL`,
    todayLp,
    idleDays: idleStreak,
    isDecaying,
    decayPerDay: tier.decayPerDay,
    graceLeft,
  };
}
