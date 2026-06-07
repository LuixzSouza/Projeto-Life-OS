// lib/holidays.ts
// Feriados nacionais brasileiros — local-first, sem depender de API externa.
// Inclui feriados fixos + móveis (derivados da Páscoa via computus de Gauss).
// Usado pela Agenda/agregador para exibir feriados como itens read-only
// (não têm userId nem entram na tabela Event).

export type HolidayType = "national" | "optional";

export interface Holiday {
  /** Meio-dia local do dia do feriado (evita deslocamento de fuso). */
  date: Date;
  name: string;
  /** "national" = feriado oficial; "optional" = ponto facultativo (Carnaval/Corpus Christi). */
  type: HolidayType;
}

/**
 * Domingo de Páscoa (Anonymous Gregorian / algoritmo de Gauss).
 * Base para os feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi).
 */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** Soma dias a uma data, normalizando para meio-dia local. */
function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

function fixed(year: number, month1: number, day: number, name: string, type: HolidayType): Holiday {
  return { date: new Date(year, month1 - 1, day, 12, 0, 0), name, type };
}

/** Feriados nacionais (e pontos facultativos principais) de um ano específico. */
export function getHolidaysForYear(year: number): Holiday[] {
  const easter = easterSunday(year);

  const list: Holiday[] = [
    fixed(year, 1, 1, "Confraternização Universal", "national"),
    { date: addDays(easter, -48), name: "Carnaval (segunda)", type: "optional" },
    { date: addDays(easter, -47), name: "Carnaval", type: "optional" },
    { date: addDays(easter, -2), name: "Sexta-feira Santa", type: "national" },
    fixed(year, 4, 21, "Tiradentes", "national"),
    fixed(year, 5, 1, "Dia do Trabalho", "national"),
    { date: addDays(easter, 60), name: "Corpus Christi", type: "optional" },
    fixed(year, 9, 7, "Independência do Brasil", "national"),
    fixed(year, 10, 12, "Nossa Senhora Aparecida", "national"),
    fixed(year, 11, 2, "Finados", "national"),
    fixed(year, 11, 15, "Proclamação da República", "national"),
    fixed(year, 12, 25, "Natal", "national"),
  ];

  // Consciência Negra virou feriado nacional pela Lei 14.759/2023 (a partir de 2024).
  if (year >= 2024) {
    list.push(fixed(year, 11, 20, "Consciência Negra", "national"));
  }

  return list.sort((a, b) => +a.date - +b.date);
}

/** Feriados que caem dentro do intervalo [start, end] (inclusive). */
export function getHolidaysInRange(start: Date, end: Date): Holiday[] {
  const out: Holiday[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    for (const h of getHolidaysForYear(y)) {
      if (h.date >= start && h.date <= end) out.push(h);
    }
  }
  return out.sort((a, b) => +a.date - +b.date);
}
