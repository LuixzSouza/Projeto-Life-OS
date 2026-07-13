"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, ChevronDown, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BrainDumpBoxProps {
    /** Título curto do que a IA vai estruturar (ex.: "Adicionar experiência com IA"). */
    title: string;
    description: string;
    placeholder: string;
    /**
     * Recebe o texto livre e devolve quantos itens foram criados (ou um erro).
     * O pai é quem chama a action e adiciona ao formulário.
     */
    onParse: (text: string) => Promise<{ ok: true; count: number } | { ok: false; error: string }>;
}

/**
 * Caixa de "despejo mental": o usuário cola/escreve tudo bagunçado e a IA
 * estrutura nos campos certos. Recolhível para não poluir o formulário.
 */
export function BrainDumpBox({ title, description, placeholder, onParse }: BrainDumpBoxProps) {
    const [open, setOpen] = useState(false);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const run = async () => {
        if (!text.trim()) {
            toast.info("Escreva ou cole algo primeiro.");
            return;
        }
        setLoading(true);
        try {
            const res = await onParse(text);
            if (!res.ok) {
                toast.error(res.error);
                return;
            }
            toast.success(res.count === 1 ? "1 item estruturado e adicionado!" : `${res.count} itens estruturados e adicionados!`);
            setText("");
            setOpen(false);
        } catch {
            toast.error("Falha ao consultar a IA. Tente de novo.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-[1.5rem] border border-violet-500/20 bg-violet-500/[0.04] overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-violet-500/[0.06]"
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 border border-violet-500/20">
                    <Wand2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">{title}</span>
                    <span className="block text-[10px] font-semibold text-muted-foreground truncate">{description}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
            </button>

            {open && (
                <div className="px-4 pb-4 pt-1 space-y-3">
                    <Textarea
                        autoFocus
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={placeholder}
                        className="min-h-[120px] w-full resize-none rounded-xl border-violet-500/20 bg-background/60 text-sm leading-relaxed"
                    />
                    <div className="flex justify-end">
                        <Button
                            onClick={run}
                            disabled={loading}
                            className="gap-2 rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            {loading ? "Estruturando…" : "Estruturar com IA"}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
