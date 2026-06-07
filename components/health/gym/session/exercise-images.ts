"use client";

import { useEffect, useState } from "react";

// Demonstração visual dos exercícios usando a base pública (domínio público)
// "free-exercise-db" (yuhonas) via CDN jsDelivr. Cada exercício tem 2 fotos
// (início/fim do movimento) — alternar entre elas cria a animação estilo
// "app de desafio de 30 dias". Degrada para a capa em gradiente se offline/sem match.

const INDEX_URL = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/dist/exercises.json";
const IMG_BASE = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";
const LS_KEY = "lifeos:gym:exdb-index-v1";

interface Slim { n: string; imgs: string[] }

let cache: Slim[] | null = null;
let inflight: Promise<Slim[]> | null = null;

function fromLS(): Slim[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as Slim[]) : null;
    return Array.isArray(arr) && arr.length ? arr : null;
  } catch {
    return null;
  }
}

function toLS(slim: Slim[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(slim));
  } catch {
    /* quota — sem problema, fica só em memória */
  }
}

async function loadIndex(): Promise<Slim[]> {
  if (cache) return cache;
  const ls = fromLS();
  if (ls) { cache = ls; return ls; }
  if (!inflight) {
    inflight = fetch(INDEX_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("http"))))
      .then((arr: { name?: string; images?: string[] }[]) => {
        const slim: Slim[] = arr
          .filter((e) => e.name && Array.isArray(e.images) && e.images.length)
          .map((e) => ({ n: e.name!.toLowerCase(), imgs: e.images!.slice(0, 2) }));
        cache = slim;
        toLS(slim);
        return slim;
      })
      .catch(() => {
        cache = [];
        return [];
      });
  }
  return inflight;
}

// Traduz termos PT→EN (frases mais longas primeiro) para casar com os nomes da base.
const REPLACEMENTS: [RegExp, string][] = [
  [/supino inclinado/g, "incline bench press"],
  [/supino declinado/g, "decline bench press"],
  [/supino fechado/g, "close grip bench press"],
  [/supino na maquina/g, "machine bench press"],
  [/supino/g, "bench press"],
  [/crucifixo inverso/g, "reverse fly"],
  [/crucifixo/g, "fly"],
  [/crossover/g, "cable crossover"],
  [/peck deck|voador/g, "pec deck"],
  [/flexao/g, "push up"],
  [/pullover/g, "pullover"],
  [/puxada/g, "pulldown"],
  [/remada alta/g, "upright row"],
  [/remada/g, "row"],
  [/barra fixa/g, "pull up"],
  [/levantamento terra romeno|terra romeno|romeno/g, "romanian deadlift"],
  [/levantamento terra|terra/g, "deadlift"],
  [/encolhimento/g, "shrug"],
  [/agachamento sumo|sumo/g, "sumo squat"],
  [/agachamento frontal/g, "front squat"],
  [/agachamento hack/g, "hack squat"],
  [/agachamento/g, "squat"],
  [/leg press/g, "leg press"],
  [/cadeira extensora/g, "leg extension"],
  [/cadeira flexora|mesa flexora/g, "leg curl"],
  [/afundo bulgaro|bulgaro/g, "bulgarian split squat"],
  [/afundo|passada|avanco/g, "lunge"],
  [/stiff/g, "stiff leg deadlift"],
  [/panturrilha/g, "calf raise"],
  [/cadeira abdutora|abdutora/g, "hip abduction"],
  [/cadeira adutora|adutora/g, "hip adduction"],
  [/elevacao pelvica|ponte de gluteo/g, "hip thrust"],
  [/desenvolvimento arnold|arnold/g, "arnold press"],
  [/desenvolvimento/g, "shoulder press"],
  [/elevacao lateral/g, "lateral raise"],
  [/elevacao frontal/g, "front raise"],
  [/remada baixa/g, "seated cable row"],
  [/face pull/g, "face pull"],
  [/rosca martelo/g, "hammer curl"],
  [/rosca scott/g, "preacher curl"],
  [/rosca concentrada/g, "concentration curl"],
  [/rosca inversa/g, "reverse curl"],
  [/rosca/g, "curl"],
  [/triceps testa/g, "lying triceps extension"],
  [/triceps corda|triceps pulley|triceps na polia/g, "triceps pushdown"],
  [/triceps frances/g, "triceps extension"],
  [/triceps coice|coice/g, "kickback"],
  [/mergulho|paralelas/g, "dips"],
  [/triceps/g, "triceps"],
  [/abdominal infra|elevacao de pernas/g, "leg raise"],
  [/abdominal obliquo|obliquo/g, "oblique crunch"],
  [/abdominal/g, "crunch"],
  [/prancha/g, "plank"],
  [/russian twist/g, "russian twist"],
  [/mountain climber/g, "mountain climber"],
  [/roda abdominal/g, "ab roller"],
  [/gluteo/g, "glute"],
  // qualificadores (traduz ou remove para melhorar o casamento)
  [/reto|livre|direta|direto|fixa/g, " "],
  [/alternada|alternado/g, "alternate"],
  [/inclinado|inclinada/g, "incline"],
  [/declinado|declinada/g, "decline"],
  [/sentado|sentada/g, "seated"],
  [/curvada|curvado/g, "bent over"],
  [/pronada|pronado/g, "pronated"],
  // equipamentos
  [/halteres|halter/g, "dumbbell"],
  [/barra w/g, "ez bar"],
  [/barra/g, "barbell"],
  [/polia/g, "cable"],
  [/maquina/g, "machine"],
  [/unilateral|serrote/g, "one arm"],
];

const STOP = new Set(["de", "da", "do", "com", "na", "no", "em", "the", "a", "o", "e", "with", "of"]);

function ptToTokens(name: string): string[] {
  let s = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/\([^)]*\)/g, " "); // remove parênteses
  for (const [re, en] of REPLACEMENTS) s = s.replace(re, en);
  return s.split(/[^a-z]+/).filter((t) => t.length > 1 && !STOP.has(t));
}

function matchImages(slim: Slim[], name: string): string[] | null {
  const tokens = ptToTokens(name);
  if (tokens.length === 0 || slim.length === 0) return null;
  let best: Slim | null = null;
  let bestScore = 0;
  for (const e of slim) {
    let score = 0;
    for (const t of tokens) if (e.n.includes(t)) score += 1;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  const need = tokens.length >= 2 ? 2 : 1;
  if (best && bestScore >= need) return best.imgs.map((p) => IMG_BASE + p);
  return null;
}

/** Hook: devolve as URLs das fotos de demonstração do exercício (ou null). */
export function useExerciseImages(name?: string): string[] | null {
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => {
    let active = true;
    const q = name?.trim();
    loadIndex().then((slim) => {
      if (active) setUrls(q ? matchImages(slim, q) : null);
    });
    return () => { active = false; };
  }, [name]);
  return urls;
}
