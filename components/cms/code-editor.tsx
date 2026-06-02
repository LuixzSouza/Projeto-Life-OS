"use client";

import { useState, useCallback } from "react";
import { SitePage } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Trash2, Save, Check, TerminalSquare, ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { savePageContent, deletePage } from "@/app/(dashboard)/cms/actions";
import { formatTime } from "@/lib/utils";

// 🟢 IMPORTS DO CODEMIRROR
import CodeMirror from '@uiw/react-codemirror';
import { json as jsonLang } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';

export function CodeEditor({ page }: { page: SitePage }) {
    const [code, setCode] = useState(page.content);
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const onChange = useCallback((val: string) => {
        setCode(val);
        setIsDirty(true);
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        const formData = new FormData();
        formData.append("pageId", page.id);
        formData.append("content", code);
        try {
            await savePageContent(formData);
            setIsDirty(false);
            toast.success("Deploy realizado!");
        } catch {
            toast.error("Erro na sincronização.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDelete = async () => {
        try {
            await deletePage(page.id);
            toast.success("Endpoint removido.");
        } catch {
            toast.error("Erro ao excluir.");
        }
    };

    let isJsonValid = true;
    try { JSON.parse(code); } catch { isJsonValid = false; }

    return (
        <div className="h-full flex flex-col bg-card border border-border/40 rounded-[2rem] shadow-sm overflow-hidden animate-in fade-in duration-500">
            {/* BARRA DE FERRAMENTAS DO EDITOR */}
            <div className="flex items-center justify-between bg-muted/10 border-b border-border/40 p-4 md:px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <TerminalSquare className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="text-xs font-mono font-bold px-3 py-1 bg-background shadow-inner">
                            /{page.slug}
                        </Badge>
                    </div>

                    {isDirty ? (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Pendente
                        </Badge>
                    ) : (
                        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            <Check className="h-3 w-3" /> Live
                        </Badge>
                    )}

                    {!isJsonValid && code.length > 0 && (
                        <span className="hidden md:inline text-[10px] font-mono text-muted-foreground/60 uppercase">
                            (Raw Text Mode)
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        {/* 🟢 z-[100] adicionado para furar o blur */}
                        <AlertDialogContent className="fixed left-1/2 top-1/2 z-[100] w-[95%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-border/40 bg-background p-8 shadow-2xl">
                            <AlertDialogHeader className="flex flex-col items-center text-center">
                                <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                                    <ShieldAlert className="h-6 w-6" />
                                </div>
                                <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">Remover Endpoint?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm font-medium">
                                    A rota <code className="text-foreground font-bold">/{page.slug}</code> será excluída permanentemente.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="sm:justify-center gap-3 mt-4">
                                <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 px-6">Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleConfirmDelete} className="rounded-xl bg-destructive text-white hover:bg-destructive/90 font-bold uppercase text-[10px] tracking-widest h-11 px-6">
                                    Deletar Agora
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving} className="gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Deploy
                    </Button>
                </div>
            </div>

            {/* ÁREA DO CODEMIRROR */}
            <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
                <ScrollArea className="h-full w-full">
                    <CodeMirror
                        value={code}
                        height="100%"
                        theme={vscodeDark}
                        extensions={[jsonLang(), javascript({ jsx: true })]}
                        onChange={onChange}
                        className="text-[13px] md:text-[14px] leading-relaxed custom-codemirror"
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            bracketMatching: true,
                            autocompletion: true,
                        }}
                    />
                </ScrollArea>
            </div>

            {/* RODAPÉ DO EDITOR */}
            <div className="bg-muted/10 border-t border-border/40 p-3 px-6 flex justify-between items-center text-[10px] font-mono font-bold text-muted-foreground/50 uppercase tracking-widest shrink-0">
                <span>Instance: {page.id.split('-')[0]}</span>
                <span>Sincronizado: {formatTime(page.updatedAt)}</span>
            </div>
        </div>
    );
}
