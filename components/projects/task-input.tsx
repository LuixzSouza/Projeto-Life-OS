'use client';

import {
    X, Paperclip, Code, List, Sparkles,
    Check, Loader2, Bold, Italic, Link as LinkIcon,
    CornerDownLeft, LucideIcon
} from "lucide-react";
import { createTask } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskInputProps {
    projectId: string;
}

type MarkdownType = 'code' | 'list' | 'bold' | 'italic' | 'link';

export function TaskInput({ projectId }: TaskInputProps) {
    const [content, setContent] = useState("");
    const [image, setImage] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const MAX_CHARS = 1000; // Aumentado para suportar textos maiores
    const hasContent = content.length > 0 || image !== null;

    // --- FORMATAÇÃO INTELIGENTE (SEM ANY) ---
    const applyMarkdown = (type: MarkdownType) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selection = content.substring(start, end);
        const before = content.substring(0, start);
        const after = content.substring(end);

        const configs: Record<MarkdownType, { wrap: string; placeholder: string }> = {
            bold: { wrap: '**', placeholder: 'negrito' },
            italic: { wrap: '*', placeholder: 'itálico' },
            code: { wrap: '`', placeholder: 'código' },
            list: { wrap: '\n- ', placeholder: 'item' },
            link: { wrap: '[', placeholder: 'link](url)' },
        };

        const { wrap, placeholder } = configs[type];
        let newText = "";
        let newStart = 0;
        let newEnd = 0;

        if (selection.length > 0) {
            newText = before + wrap + selection + (type === 'list' ? '' : wrap) + after;
            newStart = start + wrap.length;
            newEnd = end + wrap.length;
        } else {
            newText = before + wrap + placeholder + (type === 'list' ? '' : wrap) + after;
            newStart = start + wrap.length;
            newEnd = newStart + placeholder.length;
        }

        setContent(newText);
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newStart, newEnd);
        }, 0);
    };

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith("image/")) {
            toast.error("Apenas imagens são permitidas");
            return;
        }
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            setImage(e.target?.result as string);
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    }, []);

    // Cola um print direto da área de transferência (Ctrl+V).
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.includes("image")) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    handleFile(file);
                    toast.success("Print colado!");
                }
                return;
            }
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !image) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("title", content.trim()); 
            formData.append("projectId", projectId);
            if (image) formData.append("image", image);

            await createTask(formData);
            
            setIsSuccess(true);
            setContent("");
            setImage(null);
            setIsFocused(false);
            setTimeout(() => setIsSuccess(false), 2000);
            toast.success("Tarefa adicionada!");
        } catch {
            toast.error("Erro na transmissão de dados");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <TooltipProvider delayDuration={100}>
            <motion.div
                layout
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFile(file);
                }}
                className={cn(
                    "relative w-full border rounded-2xl transition-all duration-300",
                    "bg-card shadow-sm flex flex-col",
                    isFocused ? "border-primary/50 shadow-md ring-1 ring-primary/10" : "border-border/60 hover:border-border",
                    isDragging && "border-primary border-dashed bg-primary/5",
                    isSuccess && "border-emerald-500/60 bg-emerald-500/[0.02]"
                )}
            >
                {/* 1. CONTAINER DE SCROLL PARA TEXTO LONGO */}
                <div className="flex-1 overflow-y-auto max-h-[400px] scrollbar-none p-4 md:p-6 pb-2">
                    
                    {/* PREVIEW DE IMAGEM */}
                    <AnimatePresence>
                        {image && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="mb-4"
                            >
                                <div className="relative group w-fit">
                                    <img src={image} alt="Preview" className="h-40 w-auto rounded-xl object-cover border border-border/40 shadow-md" />
                                    <button 
                                        onClick={() => setImage(null)}
                                        className="absolute -top-2 -right-2 bg-background border border-border text-foreground p-1 rounded-full shadow-lg hover:bg-rose-500 hover:text-white transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-start gap-4">
                        <div className="pt-1.5 shrink-0">
                            <Button
                                type="button"
                                size="icon"
                                variant={image ? "default" : "secondary"}
                                className="h-10 w-10 rounded-xl transition-all shadow-inner"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                            >
                                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                            </Button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
                        </div>

                        <div className="flex-1 min-w-0">
                            <Textarea
                                ref={textareaRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
                                onPaste={handlePaste}
                                onFocus={() => setIsFocused(true)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                placeholder={image ? "Descreva este anexo..." : "Adicionar tarefa..."}
                                className="min-h-[44px] w-full p-0 text-base md:text-lg border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none font-medium placeholder:text-muted-foreground/30 leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. BARRA DE FERRAMENTAS FIXA NA BASE */}
                <AnimatePresence>
                    {(isFocused || hasContent) && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="p-4 pt-2 border-t border-border/40 bg-muted/5 flex flex-wrap items-center justify-between gap-4"
                        >
                            <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/40 shadow-sm">
                                <ToolbarButton icon={Bold} onClick={() => applyMarkdown('bold')} tooltip="Negrito" />
                                <ToolbarButton icon={Italic} onClick={() => applyMarkdown('italic')} tooltip="Itálico" />
                                <ToolbarButton icon={List} onClick={() => applyMarkdown('list')} tooltip="Lista" />
                                <ToolbarButton icon={Code} onClick={() => applyMarkdown('code')} tooltip="Código" />
                                <ToolbarButton icon={LinkIcon} onClick={() => applyMarkdown('link')} tooltip="Link" />
                            </div>

                            <div className="flex items-center gap-4 ml-auto">
                                {/* CONTADOR DE CARACTERES */}
                                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 font-mono">
                                    {content.length} / {MAX_CHARS}
                                </div>

                                <Button
                                    onClick={handleSubmit}
                                    disabled={isUploading || (!content.trim() && !image)}
                                    className={cn(
                                        "h-11 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95",
                                        isSuccess ? "bg-emerald-500 text-white" : "bg-foreground text-background hover:bg-foreground/90"
                                    )}
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> :
                                     isSuccess ? <Check className="h-4 w-4" /> :
                                     <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4" />
                                        <span>Adicionar</span>
                                     </div>
                                    }
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* DICA DE ATALHO */}
                {!isFocused && !hasContent && (
                    <div className="absolute right-5 bottom-4 flex items-center gap-3 opacity-50 pointer-events-none text-muted-foreground">
                        <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium">
                            <Paperclip className="h-3 w-3" /> Cole prints com Ctrl+V
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-medium">
                            <CornerDownLeft className="h-3 w-3" /> Ctrl+Enter
                        </span>
                    </div>
                )}
            </motion.div>
        </TooltipProvider>
    );
}

// --- SUB-COMPONENTE AUXILIAR (TOTALMENTE TIPADO) ---
interface ToolbarButtonProps {
    icon: LucideIcon; // Especifica o tipo do ícone da Lucide
    onClick: () => void;
    tooltip: string;
}

function ToolbarButton({ icon: Icon, onClick, tooltip }: ToolbarButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    onClick={onClick}
                    className="h-8 w-8 rounded-lg hover:bg-background hover:text-primary transition-all group"
                >
                    <Icon className="h-4 w-4 opacity-50 group-hover:opacity-100" />
                </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] font-black uppercase tracking-widest bg-zinc-950 text-white px-3 py-1.5 border-none">
                {tooltip}
            </TooltipContent>
        </Tooltip>
    );
}