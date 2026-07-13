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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <ProfileCard
                active={currentProfile === "SAFE"}
                onClick={() => onSelect("SAFE")}
                icon={ShieldCheck}
                theme="emerald"
                title="Conservador"
                subtitle="Segurança Máxima"
                desc="Prioriza preservar o capital. Ideal para Reserva de Emergência e curto prazo."
            />
            <ProfileCard
                active={currentProfile === "MODERATE"}
                onClick={() => onSelect("MODERATE")}
                icon={Banknote}
                theme="blue"
                title="Moderado"
                subtitle="Equilíbrio Inteligente"
                desc="Aceita pequenas oscilações em troca de rendimentos consistentes acima da inflação."
            />
            <ProfileCard
                active={currentProfile === "BOLD"}
                onClick={() => onSelect("BOLD")}
                icon={Rocket}
                theme="orange"
                title="Arrojado"
                subtitle="Foco em Crescimento"
                desc="Visa multiplicação de patrimônio no longo prazo, tolerando riscos maiores."
            />
        </div>
    );
}

interface ProfileCardProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    theme: "emerald" | "blue" | "orange";
    title: string;
    subtitle: string;
    desc: string;
}

function ProfileCard({ active, onClick, icon: Icon, theme, title, subtitle, desc }: ProfileCardProps) {
    // Sistema seguro de mapeamento de cores do Tailwind
    const themes = {
        emerald: {
            activeBorder: "border-emerald-500/50 shadow-emerald-500/10",
            iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            check: "text-emerald-500"
        },
        blue: {
            activeBorder: "border-blue-500/50 shadow-blue-500/10",
            iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
            check: "text-blue-500"
        },
        orange: {
            activeBorder: "border-orange-500/50 shadow-orange-500/10",
            iconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
            check: "text-orange-500"
        }
    };

    const t = themes[theme];

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "relative group flex flex-col items-start text-left p-6 rounded-2xl border-2 transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]",
                active 
                    ? `bg-background shadow-md ${t.activeBorder}` 
                    : "bg-card border-transparent shadow-sm hover:border-border hover:shadow-md"
            )}
        >
            {/* Indicador de Seleção */}
            <div className="absolute top-5 right-5 text-muted-foreground/30 transition-colors">
                {active 
                    ? <CheckCircle2 className={cn("w-6 h-6", t.check)} /> 
                    : <Circle className="w-6 h-6 group-hover:text-muted-foreground/60 transition-colors" />
                }
            </div>

            {/* Ícone */}
            <div className={cn("p-3.5 rounded-xl mb-5 transition-colors", active ? t.iconBg : "bg-muted text-muted-foreground")}>
                <Icon className="h-6 w-6" />
            </div>

            <div className="space-y-1.5 mb-3">
                <h3 className={cn("font-extrabold text-xl", active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground transition-colors")}>
                    {title}
                </h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
                    {subtitle}
                </p>
            </div>

            <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                {desc}
            </p>
        </button>
    );
}