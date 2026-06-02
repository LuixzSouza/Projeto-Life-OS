import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type HealthStatColor = "zinc" | "rose" | "blue" | "amber" | "emerald" | "indigo" | "violet";

const THEMES: Record<HealthStatColor, string> = {
    zinc: "text-zinc-500 bg-zinc-500/10",
    rose: "text-rose-500 bg-rose-500/10",
    blue: "text-blue-500 bg-blue-500/10",
    amber: "text-amber-500 bg-amber-500/10",
    emerald: "text-emerald-500 bg-emerald-500/10",
    indigo: "text-indigo-500 bg-indigo-500/10",
    violet: "text-violet-500 bg-violet-500/10",
};

interface HealthStatCardProps {
    label: string;
    value: number | string;
    unit?: string;
    icon: React.ElementType;
    color?: HealthStatColor;
    hint?: string;
}

// KPI no padrão limpo do sistema (espelha o StatCard de Projetos).
export function HealthStatCard({ label, value, unit, icon: Icon, color = "zinc", hint }: HealthStatCardProps) {
    return (
        <Card className="bg-card border-border/40 shadow-sm hover:shadow-md hover:border-border/80 transition-all">
            <CardContent className="p-5 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                    <div className="flex items-baseline gap-1.5">
                        <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
                        {unit && <span className="text-xs font-medium text-muted-foreground">{unit}</span>}
                    </div>
                    {hint && <p className="text-xs text-muted-foreground truncate">{hint}</p>}
                </div>
                <div className={cn("p-2.5 rounded-xl shrink-0", THEMES[color])}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardContent>
        </Card>
    );
}
