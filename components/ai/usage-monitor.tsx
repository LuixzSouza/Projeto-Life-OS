"use client";

import { Progress } from "@/components/ui/progress";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Cloud, Zap, Sparkles, Activity, Cpu } from "lucide-react";
import { Settings } from "@prisma/client";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * 1. INTERFACES E TIPAGEM
 * -----------------------------------------------------------------------------------------------*/

interface UsageMonitorProps {
    settings: Settings | null;
}

interface UsageItemProps {
    icon: React.ReactNode;
    label: string;
    used: number;
    limit: number;
    colorClass: string;
    textColorClass: string;
}

/* -------------------------------------------------------------------------------------------------
 * 2. COMPONENTE PRINCIPAL (CONTAINER HUD)
 * -----------------------------------------------------------------------------------------------*/

export function UsageMonitor({ settings }: UsageMonitorProps) {
    // Parse seguro para evitar crash do JSON
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
        <div className="flex items-center gap-6 p-3 px-6 border border-border/40 rounded-full bg-background/80 backdrop-blur-md shadow-sm w-fit">
            
            <div className="hidden sm:flex items-center gap-2 pr-4 border-r border-border/40">
                <Activity className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/70">
                    Telemetria
                </span>
            </div>

            {/* OpenAI Monitor */}
            <UsageItem 
                icon={<Cloud className="h-3.5 w-3.5" />}
                label="OpenAI"
                used={usage.openai || 0}
                limit={LIMITS.openai}
                colorClass="bg-emerald-500"
                textColorClass="text-emerald-500"
            />
            
            {/* Groq Monitor */}
            <UsageItem 
                icon={<Zap className="h-3.5 w-3.5" />}
                label="Groq"
                used={usage.groq || 0}
                limit={LIMITS.groq}
                colorClass="bg-orange-500"
                textColorClass="text-orange-500"
            />

            {/* Google Monitor */}
            <UsageItem 
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Gemini"
                used={usage.google || 0}
                limit={LIMITS.google}
                colorClass="bg-blue-500"
                textColorClass="text-blue-500"
            />
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * 3. ITEM INDIVIDUAL (GATILHO E MODAL DE DETALHES)
 * -----------------------------------------------------------------------------------------------*/

function UsageItem({ icon, label, used, limit, colorClass, textColorClass }: UsageItemProps) {
    const percent = Math.min((used / limit) * 100, 100);
    const isCritical = percent > 90;

    return (
        <HoverCard openDelay={100} closeDelay={100}>
            {/* GATILHO (O QUE APARECE NA BARRA) */}
            <HoverCardTrigger asChild>
                <div className="flex flex-col gap-1.5 w-24 sm:w-28 cursor-crosshair group">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/80 group-hover:text-foreground transition-colors">
                        <span className={cn("flex items-center gap-1.5 transition-colors", "group-hover:" + textColorClass)}>
                            {icon} {label}
                        </span>
                        <span className={cn(isCritical && "text-rose-500 animate-pulse")}>
                            {Math.round(percent)}%
                        </span>
                    </div>
                    {/* Barra de Progresso Miniatura */}
                    <div className="relative h-1 w-full bg-muted/50 rounded-full overflow-hidden">
                        <div 
                            className={cn("absolute top-0 left-0 h-full transition-all duration-1000 ease-out", colorClass, isCritical && "bg-rose-500")}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
            </HoverCardTrigger>

            {/* CONTEÚDO DO HOVER (O MODAL TÁTICO) */}
            <HoverCardContent 
                sideOffset={12}
                className="w-72 p-0 rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden"
            >
                {/* Header do Card */}
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/10">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-muted-foreground">
                        <Cpu className="h-4 w-4" /> Uso de Tokens
                    </h4>
                    <span className={cn(
                        "text-[8px] font-black tracking-widest px-2 py-1 rounded-full text-background uppercase shadow-sm", 
                        isCritical ? "bg-rose-500 animate-pulse" : colorClass
                    )}>
                        {isCritical ? "CRÍTICO" : "CICLO ATIVO"}
                    </span>
                </div>
                
                {/* Corpo do Card */}
                <div className="p-4 space-y-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <span className={cn("text-3xl font-black font-mono tracking-tighter", isCritical ? "text-rose-500" : textColorClass)}>
                                {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(used)}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 mb-1.5">
                                de {new Intl.NumberFormat('pt-BR', { notation: "compact" }).format(limit)}
                            </span>
                        </div>
                        
                        {/* Barra de Progresso Detalhada */}
                        <div className="relative h-2 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20 shadow-inner">
                            <div 
                                className={cn("absolute top-0 left-0 h-full transition-all duration-1000 shadow-[0_0_10px_currentColor]", colorClass, isCritical && "bg-rose-500")}
                                style={{ width: `${percent}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-muted/30 p-3 rounded-xl border border-border/20">
                        <p className="text-[10px] text-muted-foreground/80 leading-relaxed font-medium">
                            Contabiliza o tráfego neural de entrada e saída pela API. A telemetria é reiniciada automaticamente no dia <strong className="text-foreground">01</strong> de cada mês.
                        </p>
                    </div>
                </div>
            </HoverCardContent>
        </HoverCard>
    );
}