"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Maximize2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFieldFocus } from "./field-focus";
import { polishResumeText, type PolishKind } from "@/app/(dashboard)/jobs/resume-ai-actions";

interface SmartTextareaProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    placeholder?: string;
    className?: string;
    /** Altura mínima em px (o campo cresce sozinho a partir daí). */
    minHeight?: number;
    /** Faixa recomendada de caracteres — mostra contador colorido. */
    recommendedRange?: [number, number];
    /** Quando definido, exibe o botão ✨ que pede reescrita à IA. */
    polishKind?: PolishKind;
    /** Pistas para a IA (cargo, empresa, stack) sem inventar fatos. */
    polishContext?: string;
}

/**
 * Textarea "inteligente": cresce com o conteúdo (fim do texto espremido),
 * botão de expandir para um editor em tela cheia e, opcionalmente, um botão ✨
 * que pede à IA para reescrever o campo — a sugestão passa pelo modal de foco
 * (Aceitar/Descartar), nunca sobrescreve direto.
 */
export function SmartTextarea({
    value,
    onChange,
    label,
    placeholder,
    className,
    minHeight = 80,
    recommendedRange,
    polishKind,
    polishContext,
}: SmartTextareaProps) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const { openEditor, openSuggestion } = useFieldFocus();
    const [polishing, setPolishing] = useState(false);

    // Auto-grow: cresce conforme o conteúdo, sem barra de rolagem interna.
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.max(minHeight, el.scrollHeight)}px`;
    }, [value, minHeight]);

    const handlePolish = async () => {
        if (!polishKind) return;
        if (!value.trim()) {
            toast.info("Escreva algo primeiro para a IA melhorar.");
            return;
        }
        setPolishing(true);
        try {
            const res = await polishResumeText({ kind: polishKind, text: value, context: polishContext });
            if (!res.success) {
                toast.error(res.error);
                return;
            }
            openSuggestion({
                label,
                original: value,
                suggestion: res.content,
                onAccept: onChange,
            });
        } catch {
            toast.error("Falha ao consultar a IA. Tente de novo.");
        } finally {
            setPolishing(false);
        }
    };

    const len = value.length;
    const withinRange = recommendedRange
        ? len >= recommendedRange[0] && len <= recommendedRange[1]
        : true;

    return (
        <div className="relative">
            <Textarea
                ref={ref}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{ minHeight }}
                className={cn(
                    "w-full resize-none overflow-hidden rounded-xl border-border/50 bg-muted/30 leading-relaxed pr-20",
                    className
                )}
            />

            {/* Ferramentas flutuantes no canto superior direito do campo. */}
            <div className="absolute right-2 top-2 flex items-center gap-1">
                {polishKind && (
                    <button
                        type="button"
                        onClick={handlePolish}
                        disabled={polishing}
                        aria-label="Melhorar com IA"
                        title="Melhorar com IA"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-500 transition-colors hover:bg-violet-500/20 disabled:opacity-50"
                    >
                        {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => openEditor({ label, value, onCommit: onChange, placeholder, recommendedRange })}
                    aria-label="Expandir editor"
                    title="Expandir editor"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
                >
                    <Maximize2 className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Contador com a faixa recomendada (quando houver). */}
            {recommendedRange && len > 0 && (
                <div className="mt-1 flex justify-end">
                    <span
                        className={cn(
                            "text-[10px] font-mono font-bold",
                            withinRange ? "text-emerald-600" : "text-amber-600"
                        )}
                        title={`Faixa recomendada: ${recommendedRange[0]}–${recommendedRange[1]} caracteres`}
                    >
                        {len} / {recommendedRange[0]}–{recommendedRange[1]}
                    </span>
                </div>
            )}
        </div>
    );
}
