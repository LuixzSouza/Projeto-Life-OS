"use client";

import { ShieldCheck, Banknote, Rocket, LucideIcon, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export type InvestorProfile = "SAFE" | "MODERATE" | "BOLD";

interface ProfileSelectorProps {
    currentProfile: InvestorProfile;
    onSelect: (p: InvestorProfile) => void;
}

export function ProfileSelector({ currentProfile, onSelect }: ProfileSelectorProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProfileCard
                id="SAFE"
                active={currentProfile === "SAFE"}
                onClick={() => onSelect("SAFE")}
                icon={ShieldCheck}
                colorClass="text-emerald-600 bg-emerald-500/10 border-emerald-500/50"
                title="Conservador"
                subtitle="Segurança Máxima"
                desc="Prioriza preservar o capital. Ideal para Reserva de Emergência e curto prazo."
            />
            <ProfileCard
                id="MODERATE"
                active={currentProfile === "MODERATE"}
                onClick={() => onSelect("MODERATE")}
                icon={Banknote}
                colorClass="text-blue-600 bg-blue-500/10 border-blue-500/50"
                title="Moderado"
                subtitle="Equilíbrio Inteligente"
                desc="Aceita pequenas oscilações em troca de rendimentos acima da inflação."
            />
            <ProfileCard
                id="BOLD"
                active={currentProfile === "BOLD"}
                onClick={() => onSelect("BOLD")}
                icon={Rocket}
                colorClass="text-orange-600 bg-orange-500/10 border-orange-500/50"
                title="Arrojado"
                subtitle="Foco em Crescimento"
                desc="Visa multiplicação de patrimônio no longo prazo, aceitando riscos."
            />
        </div>
    );
}

interface ProfileCardProps {
    id: string;
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    colorClass: string;
    title: string;
    subtitle: string;
    desc: string;
}

function ProfileCard({ active, onClick, icon: Icon, colorClass, title, subtitle, desc }: ProfileCardProps) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "relative group flex flex-col items-start text-left p-5 rounded-xl border-2 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                active 
                    ? `bg-background shadow-md ${colorClass.split(" ")[2]}` // Borda colorida se ativo
                    : "bg-card border-transparent hover:border-border/80 hover:bg-muted/30"
            )}
        >
            {/* Indicador de Seleção (Radio Style) */}
            <div className="absolute top-4 right-4 text-muted-foreground/30 transition-colors">
                {active 
                    ? <CheckCircle2 className={cn("w-5 h-5", colorClass.split(" ")[0])} /> 
                    : <Circle className="w-5 h-5 group-hover:text-muted-foreground" />
                }
            </div>

            <div className={cn("p-3 rounded-xl mb-4 transition-colors", active ? colorClass : "bg-muted text-muted-foreground")}>
                <Icon className="h-6 w-6" />
            </div>

            <div className="space-y-1 mb-3">
                <h3 className={cn("font-bold text-lg", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                    {title}
                </h3>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {subtitle}
                </p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
                {desc}
            </p>
        </button>
    );
}