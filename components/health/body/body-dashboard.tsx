"use client";

import { useState } from "react";
import { BodyStats } from "@/lib/body-math";
import { BodyStatsOverview } from "./body-stats-overview";
import { BodyVitalMetrics } from "./body-vital-metrics";
import { BodyMeasurementsDialog } from "./body-measurements-dialog";
import { BodyEvolutionChart, type BodyEvolutionPoint } from "./body-evolution-chart";
import { BodyProgressCard, type BodyProgressInfo } from "./body-progress-card";

export function BodyDashboard({ stats: initialStats, evolution = [], progress = null }: { stats: BodyStats; evolution?: BodyEvolutionPoint[]; progress?: BodyProgressInfo | null }) {
    const [open, setOpen] = useState(false);

    // Estado Visual (Dados confirmados)
    const [stats, setStats] = useState<BodyStats>(initialStats);

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-24">
            <BodyStatsOverview stats={stats} onEdit={() => setOpen(true)} />

            <BodyProgressCard progress={progress} />

            <BodyEvolutionChart data={evolution} />

            <BodyVitalMetrics stats={stats} onEdit={() => setOpen(true)} />

            <BodyMeasurementsDialog
                open={open}
                onOpenChange={setOpen}
                initialStats={stats}
                onSaved={setStats}
            />
        </div>
    );
}
