"use client";

import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Cloud, Zap } from "lucide-react";
import { Settings } from "@prisma/client";

interface UsageMonitorProps {
    settings: Settings | null;
}

interface UsageItemProps {
    icon: React.ReactNode;
    label: string;
    used: number;
    percent: number;
    color: string;
}

export function UsageMonitor({ settings }: UsageMonitorProps) {
    // Parse seguro
    const usage = settings?.aiUsage ? JSON.parse(settings.aiUsage) : {};
    
    // Limites Teóricos
    const LIMITS: Record<string, number> = {
        openai: 100000, 
        groq: 500000,   
        google: 100000
    };

    const getPercent = (provider: string) => {
        const used = (usage[provider] as number) || 0;
        const limit = LIMITS[provider] || 100000;
        return Math.min((used / limit) * 100, 100);
    };

    return (
        <div className="flex gap-4">
            {/* OpenAI Monitor */}
            <UsageItem 
                icon={<Cloud className="h-3 w-3 text-emerald-500" />}
                label="OpenAI"
                used={(usage.openai as number) || 0}
                percent={getPercent('openai')}
                color="bg-emerald-500"
            />
            
            {/* Groq Monitor */}
            <UsageItem 
                icon={<Zap className="h-3 w-3 text-orange-500" />}
                label="Groq"
                used={(usage.groq as number) || 0}
                percent={getPercent('groq')}
                color="bg-orange-500"
            />
        </div>
    );
}

function UsageItem({ icon, label, used, percent, color }: UsageItemProps) {
    return (
        <HoverCard>
            <HoverCardTrigger asChild>
                <div className="flex flex-col gap-1 w-24 cursor-help">
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase font-bold">
                        <span className="flex items-center gap-1">{icon} {label}</span>
                        <span>{Math.round(percent)}%</span>
                    </div>
                    <Progress value={percent} className="h-1 bg-zinc-200 dark:bg-zinc-800" indicatorClassName={color} />
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-60">
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">Uso Mensal: {label}</h4>
                    <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {new Intl.NumberFormat('pt-BR').format(used)} <span className="text-xs font-normal text-zinc-500">tokens</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                        Isso é uma estimativa baseada no texto enviado e recebido. O reset é automático mensalmente.
                    </p>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}