import { prisma } from "@/lib/prisma";
import { GymView } from "@/components/health/gym/gym-view";
import { SerializedChallenge } from "@/components/health/gym/challenges-panel";
import { Dumbbell } from "lucide-react";
import { Metadata } from "next";
import { HealthActions } from "@/components/health/health-actions";
import { getCurrentUserId } from "@/lib/auth";
import { getMuscleRecovery } from "@/app/(dashboard)/health/actions";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { BackLink } from "@/components/ui/back-link";
import { ErrorState } from "@/components/ui/error-state";
import { StartLiveButton } from "@/components/health/gym/session/start-live-button";
import { PendingSessionsSync } from "@/components/health/gym/session/pending-sync";
import type { MuscleRecovery } from "@/components/health/gym/session/session-types";

export const metadata: Metadata = {
  title: "Treino de Força | Life OS",
  description: "Gestão de treinos e sobrecarga progressiva.",
};

// --- Interfaces & Tipos ---

interface GymSet {
  reps: string;
  weight: string;
  done: boolean;
}

interface GymExercise {
  name: string;
  weight: string;
  sets: string;
  reps: string;
  isCompleted?: boolean;
  setLog?: GymSet[];
}

interface SerializedWorkout {
  id: string;
  title: string;
  date: string;
  duration: number;
  type: string;
  feeling: string | null;
  notes: string | null;
  muscleGroup: string; 
  exercises: GymExercise[];
}

// --- Helper: Parsing Seguro (Zero Any) ---
function parseGymExercises(jsonString: string | null): GymExercise[] {
  if (!jsonString) return [];
  
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: unknown) => {
      if (typeof item !== 'object' || item === null) {
        return { name: "Exercício Inválido", weight: "0", sets: "0", reps: "0", isCompleted: false };
      }

      const record = item as Record<string, unknown>;

      // Séries detalhadas (sessão ao vivo), quando presentes.
      const setLog = Array.isArray(record.setLog)
        ? (record.setLog as unknown[]).map((s) => {
            const sr = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
            return { reps: String(sr.reps ?? "0"), weight: String(sr.weight ?? "0"), done: Boolean(sr.done) };
          })
        : undefined;

      return {
        name: String(record.name || "Exercício"),
        weight: String(record.weight || "0"),
        sets: String(record.sets || "0"),
        reps: String(record.reps || "0"),
        isCompleted: Boolean(record.isCompleted),
        ...(setLog ? { setLog } : {}),
      };
    });
  } catch (e) {
    console.error("Erro ao processar JSON de exercícios", e);
    return [];
  }
}

export const dynamic = 'force-dynamic';

export default async function GymPage() {
  let serializedWorkouts: SerializedWorkout[] = [];
  let hasError = false;

  let serializedChallenges: SerializedChallenge[] = [];
  let recovery: MuscleRecovery[] = [];

  try {
    const userId = await getCurrentUserId();
    const [gymWorkouts, challenges, muscleRecovery] = await Promise.all([
      prisma.workout.findMany({
        where: { type: "GYM", userId },
        orderBy: { date: "desc" },
        take: 50
      }),
      prisma.challenge.findMany({
        where: { userId: userId ?? "" },
        orderBy: { createdAt: "desc" },
        include: { checkins: { select: { dayIndex: true } } },
      }),
      getMuscleRecovery().catch((): MuscleRecovery[] => []),
    ]);
    recovery = muscleRecovery;

    serializedChallenges = challenges.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      category: c.category,
      durationDays: c.durationDays,
      color: c.color,
      startDate: c.startDate.toISOString(),
      completedDays: c.checkins.map(ci => ci.dayIndex),
    }));

    serializedWorkouts = gymWorkouts.map(w => {
      const rawRecord = w as unknown as Record<string, unknown>;
      const muscleGroup = typeof rawRecord.muscleGroup === 'string' ? rawRecord.muscleGroup : "Geral";

      return {
        id: w.id,
        title: w.title,
        duration: w.duration,
        type: w.type,
        feeling: w.feeling,
        notes: w.notes,
        muscleGroup, 
        date: w.date.toISOString(),
        exercises: parseGymExercises(w.exercises)
      };
    });

  } catch (error) {
    console.error("Erro ao carregar treinos:", error);
    hasError = true;
  }

  // --- ESTADO DE ERRO SÓBRIO ---
  if (hasError) {
    return (
      <ErrorState
        title="Falha de Leitura"
        description="Não foi possível sincronizar seu histórico de treinos no momento."
        backHref="/health"
        retryHref="/health/gym"
      />
    );
  }

  // --- RENDERIZAÇÃO PRINCIPAL ---
  return (
    <PageShell>
      <PageHeader
        icon={<Dumbbell className="h-6 w-6" />}
        title="Treino de Força"
        description="Gestão de sobrecarga progressiva e histórico de sessões."
        actions={<HealthActions />}
      >
        <BackLink href="/health" label="Voltar para Overview" />
      </PageHeader>

      <PageContainer>
        {/* Despacha treinos concluídos offline assim que houver rede. */}
        <PendingSessionsSync />
        {/* CTA proeminente do treino ao vivo — visível em qualquer aba, ótimo no mobile. */}
        <StartLiveButton variant="hero" className="mb-6" />
        <GymView workouts={serializedWorkouts} challenges={serializedChallenges} recovery={recovery} />
      </PageContainer>
    </PageShell>
  );
}