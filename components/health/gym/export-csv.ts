"use client";

// Exporta o histórico de treinos em CSV (1 linha por SÉRIE — formato "long",
// pronto pra planilha/análise). Separador ";" e BOM UTF-8: abre direto no
// Excel/LibreOffice pt-BR sem quebrar acento nem coluna.

import { format } from "date-fns";
import { muscleOf, num } from "./gym-analytics";
import type { Exercise, GymWorkout } from "./gym-types";

const HEADER = [
  "data", "hora", "treino", "duracao_min", "sentimento",
  "exercicio", "grupo", "equipamento", "medida",
  "serie", "tipo", "carga_kg", "reps_ou_seg", "rpe", "feita",
] as const;

function esc(v: string | number): string {
  const s = String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

type Row = (string | number)[];

// Linhas de um exercício: usa o setLog real; registros antigos sem setLog são
// expandidos do resumo (3×12·40kg → 3 linhas iguais, todas "feitas").
function exerciseRows(w: GymWorkout, ex: Exercise): Row[] {
  const d = new Date(w.date);
  const base: Row = [
    format(d, "yyyy-MM-dd"), format(d, "HH:mm"), w.title, w.duration, w.feeling ?? "",
    ex.name, muscleOf(ex), ex.equipment ?? "", ex.timed ? "tempo" : "reps",
  ];
  const sets = ex.setLog && ex.setLog.length > 0
    ? ex.setLog
    : Array.from({ length: Math.max(1, Math.round(num(ex.sets)) || 1) }, () => ({
        reps: ex.reps, weight: ex.weight, done: true, type: "normal" as string | undefined, rpe: undefined as number | undefined,
      }));
  return sets.map((s, i) => [
    ...base,
    i + 1,
    s.type ?? "normal",
    s.weight ?? "0",
    s.reps ?? "0",
    s.rpe ?? "",
    s.done ? "sim" : "nao",
  ]);
}

export function buildWorkoutsCsv(workouts: GymWorkout[]): string {
  const rows: string[] = [HEADER.join(";")];
  // Cronológico (mais antigo primeiro) — ordem natural pra análise em planilha.
  const ordered = [...workouts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const w of ordered) {
    for (const ex of w.exercises) {
      if (!ex.name.trim()) continue;
      for (const row of exerciseRows(w, ex)) rows.push(row.map(esc).join(";"));
    }
  }
  // BOM: Excel pt-BR reconhece UTF-8 (senão "Tríceps" vira mojibake).
  return "\uFEFF" + rows.join("\r\n");
}

/** Gera e baixa o arquivo `treinos-AAAA-MM-DD.csv`. */
export function downloadWorkoutsCsv(workouts: GymWorkout[]): void {
  const csv = buildWorkoutsCsv(workouts);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `treinos-${format(new Date(), "yyyy-MM-dd")}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
