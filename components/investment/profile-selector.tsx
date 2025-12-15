import { ShieldCheck, Banknote, Rocket, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type InvestorProfile = "SAFE" | "MODERATE" | "BOLD";

interface ProfileSelectorProps {
    currentProfile: InvestorProfile;
    onSelect: (p: InvestorProfile) => void;
}

export function ProfileSelector({ currentProfile, onSelect }: ProfileSelectorProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProfileButton
                active={currentProfile === "SAFE"}
                onClick={() => onSelect("SAFE")}
                icon={ShieldCheck}
                variant="emerald"
                title="Conservador"
                desc="Prioriza segurança. Ideal para Reserva de Emergência."
            />
            <ProfileButton
                active={currentProfile === "MODERATE"}
                onClick={() => onSelect("MODERATE")}
                icon={Banknote}
                variant="blue"
                title="Moderado"
                desc="Equilíbrio para médio prazo (Ex: Trocar de Carro)."
            />
            <ProfileButton
                active={currentProfile === "BOLD"}
                onClick={() => onSelect("BOLD")}
                icon={Rocket}
                variant="orange"
                title="Arrojado"
                desc="Foco em lucro máximo no longo prazo."
            />
        </div>
    );
}

interface ProfileButtonProps {
    active: boolean;
    onClick: () => void;
    icon: LucideIcon;
    variant: "emerald" | "blue" | "orange";
    title: string;
    desc: string;
}

function ProfileButton({ active, onClick, icon: Icon, variant, title, desc }: ProfileButtonProps) {
    // Classes estáticas para o Tailwind conseguir ler
    const styles = {
        emerald: {
            active: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700",
            icon: "bg-emerald-100 text-emerald-600"
        },
        blue: {
            active: "border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-700",
            icon: "bg-blue-100 text-blue-600"
        },
        orange: {
            active: "border-orange-500 bg-orange-50 dark:bg-orange-900/10 text-orange-700",
            icon: "bg-orange-100 text-orange-600"
        }
    };

    const currentStyle = styles[variant];

    return (
        <Button
            variant="outline"
            onClick={onClick}
            className={cn(
                "h-auto py-4 flex flex-col items-start gap-2 border-2 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800",
                active ? currentStyle.active : "border-transparent hover:border-zinc-200"
            )}
        >
            <div className="flex items-center gap-2 w-full">
                <div className={cn("p-2 rounded-full", currentStyle.icon)}>
                    <Icon className="h-5 w-5" />
                </div>
                <span className="font-bold">{title}</span>
            </div>
            <p className="text-xs text-zinc-500 text-left font-normal whitespace-normal leading-relaxed">
                {desc}
            </p>
        </Button>
    );
}