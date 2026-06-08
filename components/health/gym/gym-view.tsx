"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dumbbell, Trophy } from "lucide-react";
import { GymDashboard } from "./gym-dashboard";
import { ChallengesPanel, SerializedChallenge } from "./challenges-panel";
import type { MuscleRecovery } from "./session/session-types";

// Reaproveita o tipo de workout esperado pelo GymDashboard.
interface GymExercise { name: string; weight: string; sets: string; reps: string; isCompleted?: boolean }
interface SerializedWorkout {
    id: string; title: string; date: string; duration: number; type: string;
    feeling: string | null; notes: string | null; muscleGroup: string; exercises: GymExercise[];
}

export function GymView({ workouts, challenges, recovery = [] }: { workouts: SerializedWorkout[]; challenges: SerializedChallenge[]; recovery?: MuscleRecovery[] }) {
    return (
        <Tabs defaultValue="workouts" className="w-full">
            <div className="flex justify-center mb-8">
                <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/40 h-11 w-full max-w-[420px]">
                    <TabsTrigger value="workouts" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 flex-1 h-full">
                        <Dumbbell className="h-3.5 w-3.5" /> Treinos
                    </TabsTrigger>
                    <TabsTrigger value="challenges" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 flex-1 h-full">
                        <Trophy className="h-3.5 w-3.5" /> Desafios
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="workouts" className="mt-0 focus-visible:ring-0 outline-none">
                <GymDashboard workouts={workouts} recovery={recovery} />
            </TabsContent>
            <TabsContent value="challenges" className="mt-0 focus-visible:ring-0 outline-none">
                <ChallengesPanel challenges={challenges} />
            </TabsContent>
        </Tabs>
    );
}
