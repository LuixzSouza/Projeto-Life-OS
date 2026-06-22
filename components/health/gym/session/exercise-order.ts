// Ordenação inteligente do treino (helper PURO — sem DOM/estado).
//
// Segue a recomendação clássica de prescrição de treino (NSCA/ACSM):
//  1. Exercícios MULTIARTICULARES (compostos) antes dos isoladores — exigem mais
//     técnica e energia, então vêm quando você ainda está fresco (menos risco de
//     lesão e mais carga movida).
//  2. Grupos GRANDES antes dos pequenos (pernas/costas/peito antes de bíceps/
//     tríceps): pré-fadigar o músculo pequeno limitaria o composto que depende dele
//     (ex.: tríceps cansado derruba o supino).
//  3. Abdômen e cardio por último — core fadigado compromete a estabilização dos
//     livres pesados; cardio antes rouba glicogênio das séries.
// Dentro do mesmo grupo, preserva a ordem curada do exercise-db (compostos →
// isoladores) e, em empate, a ordem em que o usuário escolheu (sort estável).

import { EXERCISES_BY_GROUP, groupOfExercise } from "../exercise-db";

// Grupos maiores/mais exigentes primeiro; estabilizadores e cardio no fim.
const GROUP_PRIORITY: Record<string, number> = {
  Pernas: 0,
  Gluteos: 1,
  Costas: 2,
  Peito: 3,
  Ombros: 4,
  Biceps: 5,
  Triceps: 6,
  Antebraco: 7,
  Abdomen: 8,
  Cardio: 9,
};

// Multiarticulares por palavra-chave (PT-BR) — cobre os nomes do exercise-db e
// variações digitadas à mão.
const COMPOUND_RE =
  /(agachamento|terra|leg press|supino|remada|puxada|pulldown|barra fixa|desenvolvimento|afundo|passada|avan[çc]o|mergulho|paralelas|hip thrust|eleva[çc][ãa]o p[ée]lvica|stiff|hack|b[úu]lgaro|sum[ôo]|flex[ãa]o de bra|burpee)/;

/** Exercício multiarticular (composto)? Heurística por nome. */
export function isCompoundExercise(name: string): boolean {
  return COMPOUND_RE.test(name.trim().toLowerCase());
}

// Posição do exercício na lista curada do grupo (já ordenada por relevância).
function curatedIndex(name: string, group?: string): number {
  if (!group) return 999;
  const list = EXERCISES_BY_GROUP[group];
  if (!list) return 999;
  const idx = list.findIndex((n) => n.toLowerCase() === name.trim().toLowerCase());
  return idx === -1 ? 999 : idx;
}

/** Score de ordenação: menor = mais cedo no treino. */
export function exerciseOrderScore(name: string, group?: string): number {
  const g = group || groupOfExercise(name);
  const groupScore = g && g in GROUP_PRIORITY ? GROUP_PRIORITY[g] : 5; // grupo desconhecido fica no meio
  const compoundScore = isCompoundExercise(name) ? 0 : 1;
  // Pesos: grupo manda, composto desempata, ordem curada refina.
  return groupScore * 10_000 + compoundScore * 1_000 + curatedIndex(name, g);
}

/** Reordena os exercícios na "melhor ordem" de treino (sort estável). */
export function smartOrder<T extends { name: string; group?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => exerciseOrderScore(a.name, a.group) - exerciseOrderScore(b.name, b.group));
}
