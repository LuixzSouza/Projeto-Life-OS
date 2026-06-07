import { cn } from "@/lib/utils";

// Ícone de corpo humano (vista frontal) com o grupo muscular alvo destacado.
// Substitui os emojis por uma representação anatômica consistente.

type Zone = "shoulders" | "chest" | "abs" | "arms" | "legs" | "heart" | "torso";

const GROUP_ZONES: Record<string, Zone[]> = {
    Peito: ["chest"],
    Costas: ["torso"],
    Pernas: ["legs"],
    Ombros: ["shoulders"],
    Biceps: ["arms"],
    Triceps: ["arms"],
    Abdomen: ["abs"],
    Gluteos: ["legs"],
    Antebraco: ["arms"],
    Cardio: ["heart"],
};

export function MuscleBodyIcon({ group, className }: { group: string; className?: string }) {
    const active = new Set(GROUP_ZONES[group] || []);
    const on = (z: Zone) => active.has(z);

    const base = "text-muted-foreground/25";
    const hl = "text-primary";

    const fill = (z: Zone) => (on(z) ? hl : base);

    return (
        <svg viewBox="0 0 48 64" className={cn("fill-current", className)} aria-hidden="true">
            {/* Cabeça */}
            <circle cx="24" cy="7.5" r="5.5" className={base} />

            {/* Ombros / deltoides */}
            <ellipse cx="13" cy="18" rx="4.2" ry="3.6" className={fill("shoulders")} />
            <ellipse cx="35" cy="18" rx="4.2" ry="3.6" className={fill("shoulders")} />

            {/* Tronco base (usado para "Costas") */}
            <rect x="16" y="15" width="16" height="24" rx="3.5" className={fill("torso")} />

            {/* Peito */}
            <path d="M16.5 16.5 H31.5 V25 Q24 29 16.5 25 Z" className={fill("chest")} />

            {/* Abdômen */}
            <rect x="18.5" y="27" width="11" height="11" rx="2" className={fill("abs")} />

            {/* Braços */}
            <rect x="7" y="19" width="5" height="16" rx="2.5" className={fill("arms")} />
            <rect x="36" y="19" width="5" height="16" rx="2.5" className={fill("arms")} />

            {/* Pernas */}
            <rect x="17" y="40" width="6.4" height="21" rx="3" className={fill("legs")} />
            <rect x="24.6" y="40" width="6.4" height="21" rx="3" className={fill("legs")} />

            {/* Coração (cardio) */}
            {on("heart") && (
                <path
                    d="M24 27 c-1.6 -2.6 -6 -2 -6 1.6 c0 2.6 3.4 4.8 6 6.4 c2.6 -1.6 6 -3.8 6 -6.4 c0 -3.6 -4.4 -4.2 -6 -1.6 Z"
                    className={hl}
                />
            )}
        </svg>
    );
}
