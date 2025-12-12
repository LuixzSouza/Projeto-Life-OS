'use client';

import { Plus, Image as ImageIcon, X, Paperclip, Smile, Code } from "lucide-react";
import { createTask } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/button";
// Usaremos Textarea do shadcn ou nativo para suportar multiline
import { Textarea } from "../ui/textarea"; 
import { cn } from "@/lib/utils";

interface TaskInputProps {
  projectId: string;
}

export function TaskInput({ projectId }: TaskInputProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Para expandir ao focar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize do textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const clipboard = e.clipboardData;
    if (!clipboard || !clipboard.items) return;

    for (let i = 0; i < clipboard.items.length; i++) {
      const item = clipboard.items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
          toast.success("Imagem anexada!");
          break;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter envia, Shift+Enter pula linha
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertMarkdown = (type: 'code' | 'list' | 'bold') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = content;
    
    let newText = "";
    let cursorOffset = 0;

    switch (type) {
      case 'code':
        newText = text.substring(0, start) + "```\n" + text.substring(start, end) + "\n```" + text.substring(end);
        cursorOffset = 4; // Posiciona cursor dentro do bloco
        break;
      case 'list':
        newText = text.substring(0, start) + "- " + text.substring(start, end) + text.substring(end);
        cursorOffset = 2;
        break;
    }

    setContent(newText);
    textareaRef.current.focus();
    // setTimeout para garantir que o react renderizou o novo valor
    setTimeout(() => {
        if(textareaRef.current) textareaRef.current.setSelectionRange(start + cursorOffset, start + cursorOffset);
    }, 0);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !image) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", content); // Usamos 'title' como conteúdo principal por enquanto
      formData.append("projectId", projectId);
      formData.append("priority", "MEDIUM");
      
      if (image) {
        formData.append("image", image);
      }

      await createTask(formData);

      setContent("");
      setImage(null);
      setIsExpanded(false); // Colapsa após enviar
      toast.success("Tarefa criada!");
      
      // Reset height
      if (textareaRef.current) textareaRef.current.style.height = "auto";

    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar tarefa.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={cn(
        "border-t bg-white dark:bg-zinc-950 transition-all duration-300 ease-in-out",
        isExpanded ? "p-4 shadow-lg -mt-4 border rounded-t-xl z-20 relative" : "p-3"
    )}>
      
      <div className="relative flex flex-col gap-3">
        {/* PREVIEW DA IMAGEM */}
        {image && (
          <div className="relative w-fit group animate-in fade-in zoom-in duration-200">
            <img src={image} alt="Preview" className="h-24 w-auto rounded-lg border shadow-sm object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-transform hover:scale-110"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex gap-3 items-start">
           {/* Botão Add (Mudou para clip/plus) */}
           <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-zinc-400 hover:text-indigo-500 mt-1 shrink-0"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
              }}
            />

          {/* Textarea Auto-Expanding */}
          <div className="flex-1 relative">
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsExpanded(true)}
                // Blur condicional: só fecha se estiver vazio. Se tiver texto, mantemos aberto para evitar perda acidental
                // onBlur={() => !content && !image && setIsExpanded(false)} 
                placeholder={image ? "Adicionar legenda..." : "O que precisa ser feito?"}
                className="min-h-[44px] max-h-[300px] resize-none overflow-hidden py-3 bg-transparent border-none focus-visible:ring-0 shadow-none text-base placeholder:text-zinc-400"
                rows={1}
            />
            
            {/* Toolbar (Só aparece quando expandido) */}
            {isExpanded && (
                <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-1 mr-auto">
                         <button onClick={() => insertMarkdown('code')} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs flex items-center gap-1 transition-colors" title="Bloco de Código">
                            <Code className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Code</span>
                         </button>
                         <button onClick={() => insertMarkdown('list')} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-xs flex items-center gap-1 transition-colors" title="Lista">
                            <span className="font-bold text-sm leading-none">•</span> <span className="hidden sm:inline">Lista</span>
                         </button>
                    </div>
                    
                    <span className="text-[10px] text-zinc-400 mr-2 hidden sm:block">
                        <strong>Enter</strong> enviar, <strong>Shift+Enter</strong> nova linha
                    </span>

                    <Button
                        onClick={() => handleSubmit()}
                        size="sm"
                        disabled={isUploading || (!content.trim() && !image)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm h-8 px-4 rounded-lg transition-all"
                    >
                        Criar Tarefa
                    </Button>
                </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Botão flutuante para fechar se estiver expandido e vazio (UX) */}
      {isExpanded && (
          <button 
            onClick={() => setIsExpanded(false)} 
            className="absolute top-2 right-2 text-zinc-300 hover:text-zinc-500 p-1"
          >
              <X className="h-4 w-4" />
          </button>
      )}
    </div>
  );
}