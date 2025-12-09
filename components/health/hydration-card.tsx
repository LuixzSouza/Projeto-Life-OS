"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Plus } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";

export function HydrationCard({ total }: { total: number }) {
    const goal = 3000;
    const percentage = Math.min((total / goal) * 100, 100);

    return (
        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-100 dark:ring-blue-900">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <Droplets className="h-4 w-4" /> Hidratação
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline justify-between">
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                        {total}<span className="text-sm font-normal opacity-70">ml</span>
                    </div>
                    <form action={logMetric}>
                        <input type="hidden" name="type" value="WATER" />
                        <input type="hidden" name="value" value="250" />
                        <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700 text-white gap-1 rounded-full">
                            <Plus className="h-3 w-3" /> 250ml
                        </Button>
                    </form>
                </div>
                <div className="mt-3 h-1.5 w-full bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${percentage}%` }} />
                </div>
                <p className="text-xs text-blue-500/80 mt-2 text-right">{Math.round(percentage)}% da meta</p>
            </CardContent>
        </Card>
    )
}