"use server";

// Regulador Adaptativo (#13) — o primeiro passo da autonomia.
// Lê o ESTADO DE HOJE (energia registrada, treino feito) e os PADRÕES já
// calculados (#8 Correlação, #15 Fricção) e devolve 1–3 sugestões concretas
// e acionáveis para o dia. Rule-based, transparente, sem prometer milagre.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { getDailyInsight } from "./focus-actions";
import { getFrictionVector } from "@/app/(dashboard)/health/actions";

export type RegulatorIcon = "edit" | "battery" | "clock" | "target" | "flame" | "dumbbell" | "wind";
export type RegulatorTone = "calm" | "neutral" | "push";

export interface RegulatorSuggestion {
  id: string;
  icon: RegulatorIcon;
  tone: RegulatorTone;
  title: string;
  detail: string;
  actionUrl?: string;
  actionLabel?: string;
}

export type RegulatorLevel = "none" | "low" | "mid" | "high";

export interface DailyRegulator {
  energyToday: number | null;
  level: RegulatorLevel;
  suggestions: RegulatorSuggestion[];
}

export async function getDailyRegulator(): Promise<DailyRegulator> {
  const userId = await getCurrentUserId();
  if (!userId) return { energyToday: null, level: "none", suggestions: [] };

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const tomorrow = new Date(start);
  tomorrow.setDate(start.getDate() + 1);

  const [todayEnergy, workoutToday, insightRes, friction] = await Promise.all([
    prisma.energyCheckin.findFirst({ where: { userId, date: { gte: start, lt: tomorrow } }, select: { energy: true } }),
    prisma.workout.count({ where: { userId, date: { gte: start, lt: tomorrow } } }),
    getDailyInsight(userId),
    getFrictionVector(),
  ]);

  const energyToday = todayEnergy?.energy ?? null;
  const level: RegulatorLevel =
    energyToday == null ? "none" : energyToday <= 2 ? "low" : energyToday === 3 ? "mid" : "high";

  const out: RegulatorSuggestion[] = [];

  // 1) Sugestão pela energia de HOJE (núcleo do regulador).
  if (level === "none") {
    out.push({
      id: "log-energy", icon: "edit", tone: "neutral",
      title: "Registre sua energia",
      detail: "Diga como você está (1–5) ali em cima e eu adapto o plano do dia.",
    });
  } else if (level === "low") {
    out.push({
      id: "low-2min", icon: "battery", tone: "calm",
      title: "Modo leve hoje",
      detail: "Energia baixa: use a versão de 2 minutos dos hábitos para manter a sequência sem se cobrar.",
    });
    out.push({
      id: "low-short", icon: "clock", tone: "calm",
      title: "Blocos curtos de foco",
      detail: "Comece com 15 min. Uma pequena vitória costuma destravar o resto.",
      actionUrl: "/agenda", actionLabel: "Criar bloco",
    });
  } else if (level === "mid") {
    out.push({
      id: "mid-one", icon: "target", tone: "neutral",
      title: "Escolha 1 prioridade",
      detail: "Energia equilibrada: reserve um bloco focado para a tarefa que mais importa hoje.",
      actionUrl: "/agenda", actionLabel: "Agendar bloco",
    });
  } else {
    out.push({
      id: "high-deep", icon: "flame", tone: "push",
      title: "Aproveite o pico",
      detail: "Energia alta: encare agora a tarefa mais difícil num bloco profundo (50 min).",
      actionUrl: "/agenda", actionLabel: "Foco profundo",
    });
  }

  // 2) Sugestão pelo padrão (#8): se treino impulsiona o foco e ainda não treinou.
  const ins = insightRes.insight;
  if (ins && ins.driver === "workout" && ins.target === "focus" && ins.deltaPct > 0 && workoutToday === 0 && level !== "none") {
    out.push({
      id: "driver-workout", icon: "dumbbell", tone: "push",
      title: "Treine cedo hoje",
      detail: `Seus dados mostram ~${ins.deltaPct}% mais foco nos dias em que você treina.`,
      actionUrl: "/health", actionLabel: "Registrar treino",
    });
  }

  // 3) Sugestão pela fricção (#15): ataca o maior atrito dos hábitos.
  if (friction.dominant === "TIME") {
    out.push({
      id: "friction-time", icon: "clock", tone: "neutral",
      title: "Combata a falta de tempo",
      detail: "Tempo é o que mais derruba seus hábitos. Reserve um horário fixo agora, antes do dia encher.",
      actionUrl: "/agenda", actionLabel: "Reservar horário",
    });
  } else if (friction.dominant === "ENVIRONMENT") {
    out.push({
      id: "friction-env", icon: "wind", tone: "neutral",
      title: "Prepare o ambiente",
      detail: "Deixe tudo pronto antes (roupa, material, app aberto) — menos atrito, mais constância.",
    });
  }

  // Prioriza energia → padrão → fricção; no máximo 3.
  return { energyToday, level, suggestions: out.slice(0, 3) };
}
