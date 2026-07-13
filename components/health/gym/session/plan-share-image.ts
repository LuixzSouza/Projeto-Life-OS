"use client";

// Gera uma IMAGEM bonita da ficha (canvas) e compartilha via Web Share API
// (WhatsApp, Instagram…) ou baixa como PNG. Diferente do link (?planimport=),
// a imagem é pra MOSTRAR a ficha — o parceiro lê os exercícios direto do print.
// Altura dinâmica: cresce com o nº de exercícios. Tema escuro fixo (o print fica
// bonito em qualquer lugar, independente do tema do app).

import { MUSCLE_META } from "../exercise-db";
import { PLAN_GOAL_META, formatTarget, totalExercises, type WorkoutPlan, type PlanDivision } from "./plan-types";

const W = 1080;
const PAD = 64;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

// Cor de destaque da divisão: 1º grupo muscular (ou do 1º exercício), senão índigo.
function divisionColor(div: PlanDivision): string {
  const g = div.muscleGroups[0] ?? div.exercises[0]?.group;
  return (g && MUSCLE_META[g]?.color) || "#6366f1";
}

const HEADER_H = 300;
const DIV_HEAD_H = 64;
const EX_ROW_H = 62;
const DIV_GAP = 28;
const FOOTER_H = 96;

function measureHeight(plan: WorkoutPlan): number {
  let h = HEADER_H;
  for (const div of plan.divisions) {
    h += DIV_HEAD_H + div.exercises.length * EX_ROW_H + DIV_GAP;
  }
  return Math.max(1350, h + FOOTER_H);
}

function buildCanvas(plan: WorkoutPlan): HTMLCanvasElement | null {
  const H = measureHeight(plan);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo: gradiente escuro premium.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0b1020");
  bg.addColorStop(1, "#111827");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Brilho decorativo no topo.
  const glow = ctx.createRadialGradient(W - 120, 80, 40, W - 120, 80, 520);
  glow.addColorStop(0, "rgba(99,102,241,0.35)");
  glow.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 400);

  ctx.textBaseline = "alphabetic";

  // Marca.
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.fillText("💪 LIFE OS · FICHA DE TREINO", PAD, 92);

  // Nome da ficha (até 2 linhas).
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 74px system-ui, sans-serif";
  const name = ellipsize(ctx, plan.name, W - PAD * 2);
  ctx.fillText(name, PAD, 180);

  // Meta: objetivo + contagens.
  const total = totalExercises(plan);
  ctx.font = "600 30px system-ui, sans-serif";
  const goalLabel = PLAN_GOAL_META[plan.goal].label.toUpperCase();
  const goalW = ctx.measureText(goalLabel).width;
  roundRect(ctx, PAD, 210, goalW + 40, 48, 24);
  ctx.fillStyle = "rgba(99,102,241,0.25)";
  ctx.fill();
  ctx.fillStyle = "#c7d2fe";
  ctx.fillText(goalLabel, PAD + 20, 243);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "400 28px system-ui, sans-serif";
  ctx.fillText(`${plan.divisions.length} divisões · ${total} exercícios`, PAD + goalW + 60, 243);

  // Divisões.
  let y = HEADER_H;
  for (const div of plan.divisions) {
    const color = divisionColor(div);
    // Barra da divisão.
    ctx.fillStyle = color;
    roundRect(ctx, PAD, y, 8, DIV_HEAD_H - 16, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 38px system-ui, sans-serif";
    ctx.fillText(ellipsize(ctx, div.label, W - PAD * 2 - 40), PAD + 28, y + 38);
    y += DIV_HEAD_H;

    // Exercícios.
    div.exercises.forEach((ex, i) => {
      const rowY = y;
      // Cartão sutil da linha.
      ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)";
      roundRect(ctx, PAD, rowY, W - PAD * 2, EX_ROW_H - 10, 14);
      ctx.fill();

      // Bolinha numerada.
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(PAD + 30, rowY + (EX_ROW_H - 10) / 2, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b1020";
      ctx.font = "800 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), PAD + 30, rowY + (EX_ROW_H - 10) / 2 + 8);
      ctx.textAlign = "left";

      // Meta (direita) — mede primeiro para reservar espaço.
      const target = formatTarget(ex.target);
      ctx.font = "700 28px system-ui, sans-serif";
      const targetW = ctx.measureText(target).width;
      // Nome (esquerda, truncado).
      ctx.fillStyle = "#f3f4f6";
      ctx.font = "600 30px system-ui, sans-serif";
      const nameMax = W - PAD * 2 - 70 - targetW - 40;
      ctx.fillText(ellipsize(ctx, ex.name, nameMax), PAD + 62, rowY + (EX_ROW_H - 10) / 2 + 10);
      // Meta.
      ctx.fillStyle = color;
      ctx.font = "700 28px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(target, W - PAD, rowY + (EX_ROW_H - 10) / 2 + 10);
      ctx.textAlign = "left";

      y += EX_ROW_H;
    });
    y += DIV_GAP;
  }

  // Rodapé.
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = "500 26px system-ui, sans-serif";
  ctx.fillText("Gerado no Life OS — seu segundo cérebro", PAD, H - 40);

  return canvas;
}

export async function sharePlanImage(plan: WorkoutPlan): Promise<"shared" | "downloaded" | "failed"> {
  try {
    const canvas = buildCanvas(plan);
    if (!canvas) return "failed";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
    if (!blob) return "failed";

    const safeName = plan.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "ficha";
    const file = new File([blob], `ficha-${safeName}.png`, { type: "image/png" });
    const text = `Ficha "${plan.name}" — ${totalExercises(plan)} exercícios. Feita no Life OS 💪`;

    type ShareData2 = { title?: string; text?: string; files?: File[] };
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData2) => boolean;
      share?: (data?: ShareData2) => Promise<void>;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: plan.name, text });
      return "shared";
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
