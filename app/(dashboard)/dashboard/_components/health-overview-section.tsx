// Seção "Overview do Dia" da Home: consolida Treino + Nutrição numa olhada.
import { prisma } from "@/lib/prisma";
import { suggestDailyGoal } from "@/lib/nutrition-calc";
import { estimateDayBurn } from "@/lib/workout-calories";
import { getMuscleRecovery } from "@/app/(dashboard)/health/actions";
import { DayOverviewCard } from "@/components/dashboard/day-overview-card";

export async function HealthOverviewSection({ userId }: { userId: string }) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [meals, workouts, latestBody, settings, recovery] = await Promise.all([
    prisma.meal.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { calories: true },
    }),
    prisma.workout.findMany({
      where: { userId, date: { gte: start, lte: end } },
      select: { type: true, duration: true, intensity: true, distance: true },
    }),
    prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: "desc" } }),
    prisma.settings.findUnique({ where: { userId }, select: { calorieGoalOverride: true } }),
    getMuscleRecovery().catch(() => []),
  ]);

  const consumed = meals.reduce((acc, m) => acc + (m.calories ?? 0), 0);

  // Mesma cadeia de meta do resto do app: override > sugestão (TDEE) > padrão.
  const suggestion = latestBody
    ? suggestDailyGoal(
        {
          weight: latestBody.weight,
          height: latestBody.height,
          gender: latestBody.gender,
          activity: latestBody.activity,
          birthDate: latestBody.birthDate,
        },
        "MAINTAIN"
      )
    : null;
  const goal = settings?.calorieGoalOverride ?? suggestion?.goal ?? 2000;

  const workoutBurn = estimateDayBurn(
    workouts.map((w) => ({
      type: w.type,
      durationMin: w.duration,
      intensity: w.intensity,
      distanceKm: w.distance,
      bodyWeightKg: latestBody?.weight ?? null,
    }))
  );

  return <DayOverviewCard consumed={consumed} goal={goal} workoutBurn={workoutBurn} recovery={recovery} />;
}
