"use client";

import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Cloud, Zap, Sparkles } from "lucide-react";
import { Settings } from "@prisma/client";
import { cn } from "@/lib/utils";

interface UsageMonitorProps {
    settings: Settings | null;
}

interface UsageItemProps {
    icon: React.ReactNode;
    label: string;
    used: number;
    limit: number;
    colorClass: string; // Classe de cor do Tailwind (ex: bg-emerald-500)
}

export function UsageMonitor({ settings }: UsageMonitorProps) {
    // Parse seguro para evitar crash
    let usage: Record<string, number> = {};
    try {
        usage = settings?.aiUsage ? JSON.parse(settings.aiUsage as string) : {};
    } catch (e) {
        usage = {};
    }
    
    // Limites Teóricos (Tokens)
    const LIMITS = {
        openai: 100000, 
        groq: 500000,   
        google: 100000
    };

    return (
        <div className="flex gap-6 p-4 border border-border rounded-xl bg-card/50">
            {/* OpenAI Monitor */}
            <UsageItem 
                icon={<Cloud className="h-3.5 w-3.5 text-emerald-500" />}
                label="OpenAI"
                used={usage.openai || 0}
                limit={LIMITS.openai}
                colorClass="bg-emerald-500"
            />
            
            {/* Groq Monitor */}
            <UsageItem 
                icon={<Zap className="h-3.5 w-3.5 text-orange-500" />}
                label="Groq"
                used={usage.groq || 0}
                limit={LIMITS.groq}
                colorClass="bg-orange-500"
            />

            {/* Google Monitor */}
            <UsageItem 
                icon={<Sparkles className="h-3.5 w-3.5 text-blue-500" />}
                label="Gemini"
                used={usage.google || 0}
                limit={LIMITS.google}
                colorClass="bg-blue-500"
            />
        </div>
    );
}

function UsageItem({ icon, label, used, limit, colorClass }: UsageItemProps) {
    const percent = Math.min((used / limit) * 100, 100);

    return (
        <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
                <div className="flex flex-col gap-1.5 w-28 cursor-help group">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                        <span className="flex items-center gap-1.5">{icon} {label}</span>
                        <span>{Math.round(percent)}%</span>
                    </div>
                    <Progress 
                        value={percent} 
                        className="h-1.5 bg-secondary" 
                        indicatorClassName={colorClass} 
                    />
                </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-64 p-4 border-border shadow-lg">
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                            {icon} Consumo: {label}
                        </h4>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white", colorClass)}>
                            MENSAL
                        </span>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-end">
                            <span className="text-2xl font-bold font-mono text-foreground">
                                {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(used)}
                            </span>
                            <span className="text-xs text-muted-foreground mb-1">
                                de {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(limit)}
                            </span>
                        </div>
                        <Progress 
                            value={percent} 
                            className="h-2 bg-secondary" 
                            indicatorClassName={colorClass} 
                        />
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Contabiliza tokens de entrada (perguntas) e saída (respostas). O contador reseta no dia 01.
                    </p>
                </div>
            </HoverCardContent>
        </HoverCard>
    )
}