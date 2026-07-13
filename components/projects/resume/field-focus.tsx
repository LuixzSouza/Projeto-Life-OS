"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Maximize2, Sparkles, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// FOCO DE CAMPO — um ÚNICO modal global (evita <Dialog> dentro de .map(), regra
// do CLAUDE.md). Serve dois modos:
//  - "edit": editor em tela cheia para textos longos (fica confortável de ler).
//  - "suggestion": revisão de uma reescrita da IA (Antes → Depois) com Aceitar/Descartar.
// Qualquer campo do builder chama useFieldFocus() para abrir.
// ============================================================================

interface EditConfig {
    label: string;
    value: string;
    onCommit: (value: string) => void;
    placeholder?: string;
    recommendedRange?: [number, number];
}

interface SuggestionConfig {
    label: string;
    original: string;
    suggestion: string;
    onAccept: (value: string) => void;
}

interface FieldFocusContextValue {
    openEditor: (cfg: EditConfig) => void;
    openSuggestion: (cfg: SuggestionConfig) => void;
}

const FieldFocusContext = createContext<FieldFocusContextValue | null>(null);

export function useFieldFocus(): FieldFocusContextValue {
    const ctx = useContext(FieldFocusContext);
    if (!ctx) throw new Error("useFieldFocus deve ser usado dentro de <FieldFocusProvider>.");
    return ctx;
}

type ModalState =
    | { mode: "edit"; cfg: EditConfig }
    | { mode: "suggestion"; cfg: SuggestionConfig }
    | null;

function CharCounter({ len, range }: { len: number; range?: [number, number] }) {
    if (!range) return <span className="text-[10px] font-mono text-muted-foreground/60">{len} caracteres</span>;
    const [min, max] = range;
    const ok = len >= min && len <= max;
    return (
        <span
            className={cn(
                "text-[10px] font-mono font-bold",
                ok ? "text-emerald-600" : "text-amber-600"
            )}
            title={`Faixa recomendada: ${min}–${max} caracteres`}
        >
            {len} / {min}–{max}
        </span>
    );
}

export function FieldFocusProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ModalState>(null);
    const [draft, setDraft] = useState("");

    const openEditor = useCallback((cfg: EditConfig) => {
        setDraft(cfg.value);
        setState({ mode: "edit", cfg });
    }, []);

    const openSuggestion = useCallback((cfg: SuggestionConfig) => {
        setDraft(cfg.suggestion);
        setState({ mode: "suggestion", cfg });
    }, []);

    const close = useCallback(() => setState(null), []);

    return (
        <FieldFocusContext.Provider value={{ openEditor, openSuggestion }}>
            {children}

            <Dialog open={state !== null} onOpenChange={(o) => { if (!o) close(); }}>
                {state && (
                    <DialogContent size="xl" className="max-h-[92dvh]">
                        {state.mode === "edit" ? (
                            <>
                                <DialogHeader
                                    icon={<Maximize2 />}
                                    title={state.cfg.label}
                                    description="Editor ampliado — escreva à vontade, o texto volta pro campo ao concluir."
                                />
                                <DialogBody>
                                    <Textarea
                                        autoFocus
                                        value={draft}
                                        onChange={(e) => setDraft(e.target.value)}
                                        placeholder={state.cfg.placeholder}
                                        className="min-h-[45vh] w-full resize-none rounded-2xl border-border/50 bg-muted/20 text-sm leading-relaxed"
                                    />
                                    <div className="mt-2 flex justify-end">
                                        <CharCounter len={draft.length} range={state.cfg.recommendedRange} />
                                    </div>
                                </DialogBody>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={close} className="rounded-xl">Cancelar</Button>
                                    <Button
                                        onClick={() => { state.cfg.onCommit(draft); close(); }}
                                        className="gap-2 rounded-xl font-bold"
                                    >
                                        <Check className="h-4 w-4" /> Concluir
                                    </Button>
                                </DialogFooter>
                            </>
                        ) : (
                            <>
                                <DialogHeader
                                    icon={<Sparkles />}
                                    iconClassName="bg-violet-500/10 text-violet-500 border-violet-500/20"
                                    title={`Sugestão da IA · ${state.cfg.label}`}
                                    description="Revise, ajuste se quiser e aceite — nada muda no seu currículo sem confirmar."
                                />
                                <DialogBody className="space-y-4">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Antes</span>
                                        <div className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border/40 bg-muted/20 p-3 text-xs text-muted-foreground">
                                            {state.cfg.original || "(vazio)"}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-violet-500">Depois (editável)</span>
                                        <Textarea
                                            value={draft}
                                            onChange={(e) => setDraft(e.target.value)}
                                            className="mt-1 min-h-[30vh] w-full resize-none rounded-2xl border-violet-500/30 bg-violet-500/[0.03] text-sm leading-relaxed"
                                        />
                                    </div>
                                </DialogBody>
                                <DialogFooter>
                                    <Button variant="ghost" onClick={close} className="gap-2 rounded-xl">
                                        <X className="h-4 w-4" /> Descartar
                                    </Button>
                                    <Button
                                        onClick={() => { state.cfg.onAccept(draft); close(); }}
                                        className="gap-2 rounded-xl bg-violet-600 font-bold text-white hover:bg-violet-700"
                                    >
                                        <Check className="h-4 w-4" /> Aceitar
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </DialogContent>
                )}
            </Dialog>
        </FieldFocusContext.Provider>
    );
}
