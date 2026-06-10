import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface AskAiButtonProps {
    /** Pergunta pré-preenchida no composer da IA (deep-link /ai?q=). */
    q: string;
    /** Rótulo visível (some no mobile; o ícone fica). */
    label?: string;
    title?: string;
    className?: string;
}

/**
 * Botão "Perguntar à IA" — leva ao Cérebro Digital com a pergunta já digitada
 * (o usuário revisa e envia). Server-safe (é só um Link), usável em qualquer
 * header/card de módulo. Estilo alinhado aos botões de header (h-9, rounded-xl).
 */
export function AskAiButton({ q, label = "Perguntar à IA", title, className }: AskAiButtonProps) {
    return (
        <Link
            href={`/ai?q=${encodeURIComponent(q)}`}
            title={title ?? `${label}: "${q}"`}
            className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/5 px-3 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-primary/10 hover:border-primary/40",
                className
            )}
        >
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden lg:inline">{label}</span>
        </Link>
    );
}
