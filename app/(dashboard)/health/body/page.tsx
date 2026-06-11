import { prisma } from "@/lib/prisma";
import { BodyDashboard } from "@/components/health/body/body-dashboard";
import { User } from "lucide-react";
import { Metadata } from "next";
import { BodyStats, calculateBodyFat, Gender } from "@/lib/body-math";
import type { BodyEvolutionPoint } from "@/components/health/body/body-evolution-chart";
import type { BodyDeltaItem, BodyProgressInfo } from "@/components/health/body/body-progress-card";
import { HealthActions } from "@/components/health/health-actions";
import { BodyBackfillBanner } from "@/components/health/body/body-backfill-banner";
import { AskAiButton } from "@/components/ai/ask-ai-button";
import { getCurrentUserId } from "@/lib/auth";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { ErrorState } from "@/components/ui/error-state";

export const metadata: Metadata = {
  title: "Composição Corporal | Life OS",
  description: "Acompanhamento de medidas, simetria e bioimpedância.",
};

export const dynamic = 'force-dynamic';

// Dia (YYYY-MM-DD) para mesclar séries de fontes diferentes no mesmo ponto do eixo X.
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Snapshot "completo" mais recente: alguns registros (ex.: peso anotado pela IA
// em versões antigas) vinham com height=0/gender N/A e sem medidas. Em vez de
// confiar só no último, coalescemos campo a campo sobre os snapshots recentes —
// cada medida vale o último valor REAL informado.
interface SnapshotRow {
  date: Date;
  weight: number;
  height: number;
  gender: string;
  activity: number | null;
  birthDate: Date | null;
  neck: number | null;
  waist: number | null;
  hip: number | null;
  shoulders: number | null;
  chest: number | null;
  armLeft: number | null;
  armRight: number | null;
  forearmLeft: number | null;
  forearmRight: number | null;
  thighLeft: number | null;
  thighRight: number | null;
  calfLeft: number | null;
  calfRight: number | null;
}

function coalesceStats(rows: SnapshotRow[]): BodyStats | null {
  if (rows.length === 0) return null;
  const pick = (get: (r: SnapshotRow) => number | null): number =>
    rows.map(get).find((v): v is number => v != null && v > 0) ?? 0;
  const gender: Gender = (rows.map((r) => r.gender).find((g) => g === "MALE" || g === "FEMALE") as Gender) ?? "MALE";
  const birth = rows.map((r) => r.birthDate).find((b): b is Date => b != null);
  return {
    weight: pick((r) => r.weight),
    height: pick((r) => r.height),
    gender,
    activityFactor: pick((r) => r.activity) || 1.2,
    birthDate: birth ? birth.toISOString().split("T")[0] : undefined,
    neck: pick((r) => r.neck),
    waist: pick((r) => r.waist),
    hip: pick((r) => r.hip),
    shoulders: pick((r) => r.shoulders),
    chest: pick((r) => r.chest),
    armLeft: pick((r) => r.armLeft),
    armRight: pick((r) => r.armRight),
    forearmLeft: pick((r) => r.forearmLeft),
    forearmRight: pick((r) => r.forearmRight),
    thighLeft: pick((r) => r.thighLeft),
    thighRight: pick((r) => r.thighRight),
    calfLeft: pick((r) => r.calfLeft),
    calfRight: pick((r) => r.calfRight),
  };
}

// Comparativo entre a medição mais recente e a anterior (de outro dia).
function buildProgress(rows: SnapshotRow[]): BodyProgressInfo | null {
  if (rows.length < 2) return null;
  const latestDay = dayKey(rows[0].date);
  const prevIdx = rows.findIndex((r) => dayKey(r.date) !== latestDay);
  if (prevIdx === -1) return null;

  const current = coalesceStats(rows);
  const previous = coalesceStats(rows.slice(prevIdx));
  if (!current || !previous) return null;

  const defs: { label: string; unit: "kg" | "cm"; direction: BodyDeltaItem["direction"]; get: (s: BodyStats) => number | undefined }[] = [
    { label: "Peso", unit: "kg", direction: "neutral", get: (s) => s.weight },
    { label: "Cintura", unit: "cm", direction: "good-down", get: (s) => s.waist },
    { label: "Quadril", unit: "cm", direction: "neutral", get: (s) => s.hip },
    { label: "Pescoço", unit: "cm", direction: "neutral", get: (s) => s.neck },
    { label: "Ombros", unit: "cm", direction: "good-up", get: (s) => s.shoulders },
    { label: "Peitoral", unit: "cm", direction: "good-up", get: (s) => s.chest },
    { label: "Braço Esq.", unit: "cm", direction: "good-up", get: (s) => s.armLeft },
    { label: "Braço Dir.", unit: "cm", direction: "good-up", get: (s) => s.armRight },
    { label: "Antebraço Esq.", unit: "cm", direction: "good-up", get: (s) => s.forearmLeft },
    { label: "Antebraço Dir.", unit: "cm", direction: "good-up", get: (s) => s.forearmRight },
    { label: "Coxa Esq.", unit: "cm", direction: "good-up", get: (s) => s.thighLeft },
    { label: "Coxa Dir.", unit: "cm", direction: "good-up", get: (s) => s.thighRight },
    { label: "Panturrilha Esq.", unit: "cm", direction: "good-up", get: (s) => s.calfLeft },
    { label: "Panturrilha Dir.", unit: "cm", direction: "good-up", get: (s) => s.calfRight },
  ];

  const items: BodyDeltaItem[] = [];
  for (const d of defs) {
    const to = d.get(current);
    const from = d.get(previous);
    if (to != null && from != null && to > 0 && from > 0) {
      items.push({ label: d.label, from, to, unit: d.unit, direction: d.direction });
    }
  }
  if (items.length === 0) return null;

  const prevDate = rows[prevIdx].date;
  const days = Math.max(1, Math.round((rows[0].date.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)));
  return {
    sinceLabel: prevDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    days,
    items,
  };
}

export default async function BodyPage() {
  let currentStats: BodyStats | null = null;
  let evolution: BodyEvolutionPoint[] = [];
  let progress: BodyProgressInfo | null = null;
  let degenerateCount = 0;
  let hasError = false;

  try {
    const userId = await getCurrentUserId();
    // Snapshots recentes (coalesce + comparativo) + histórico (peso via
    // HealthMetric, leve; % gordura via snapshots).
    const [recentSnapshots, weightHistory, measurements, degenerates] = await Promise.all([
      prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: "desc" }, take: 12 }),
      prisma.healthMetric.findMany({
        where: { userId, type: "WEIGHT" },
        orderBy: { date: "asc" },
        select: { date: true, value: true },
      }),
      prisma.bodyMeasurement.findMany({
        where: { userId },
        orderBy: { date: "asc" },
        select: { date: true, weight: true, height: true, gender: true, neck: true, waist: true, hip: true },
      }),
      // Snapshots degenerados (peso via IA antiga: height=0 / gender "N/A") → banner de correção
      prisma.bodyMeasurement.count({
        where: { userId, OR: [{ height: { lte: 0 } }, { gender: { notIn: ["MALE", "FEMALE"] } }] },
      }),
    ]);

    // Mescla por dia: peso (HealthMetric) + % gordura (Navy a partir dos snapshots).
    const byDay = new Map<string, BodyEvolutionPoint>();
    for (const w of weightHistory) {
      byDay.set(dayKey(w.date), { date: w.date.toISOString(), weight: w.value, bodyFat: null });
    }
    for (const m of measurements) {
      const key = dayKey(m.date);
      const point = byDay.get(key) ?? { date: m.date.toISOString(), weight: null, bodyFat: null };
      if (point.weight == null) point.weight = m.weight; // dia sem HealthMetric → usa o do snapshot
      const bf = calculateBodyFat({
        weight: m.weight,
        height: m.height,
        gender: (m.gender as "MALE" | "FEMALE") || "MALE",
        activityFactor: 1.2,
        waist: m.waist ?? 0,
        neck: m.neck ?? 0,
        hip: m.hip ?? 0,
      });
      if (bf > 0) point.bodyFat = Math.round(bf * 10) / 10;
      byDay.set(key, point);
    }
    evolution = Array.from(byDay.values()).sort((a, b) => +new Date(a.date) - +new Date(b.date));

    currentStats = coalesceStats(recentSnapshots) ?? {
      // Estado inicial limpo
      weight: 0, height: 0, waist: 0, neck: 0, hip: 0,
      gender: 'MALE', activityFactor: 1.2
    };
    progress = buildProgress(recentSnapshots);
    degenerateCount = degenerates;

  } catch (error) {
    console.error("Erro ao carregar dados corporais:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível recuperar suas métricas corporais no momento."
        backHref="/health"
        retryHref="/health/body"
      />
    );
  }

  return (
    <PageShell>
      <PageHeader
        icon={<User className="h-6 w-6" />}
        title="Composição Corporal"
        description="Acompanhamento de medidas, proporções e simetria."
        backHref="/health"
        backLabel="Voltar para Overview"
        actions={
          <>
            <AskAiButton q="Como está a evolução do meu peso e medidas corporais? Analise a tendência recente." label="Analisar com IA" />
            <HealthActions />
          </>
        }
      />

      <PageContainer>
        <BodyBackfillBanner count={degenerateCount} />
        <BodyDashboard stats={currentStats!} evolution={evolution} progress={progress} />
      </PageContainer>
    </PageShell>
  );
}