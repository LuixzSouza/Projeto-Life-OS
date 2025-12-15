'use client';

import { Plus, Image as ImageIcon, X, Paperclip, Code, List } from "lucide-react";
import { createTask } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { cn } from "@/lib/utils";

interface TaskInputProps {
  projectId: string;
}

export function TaskInput({ projectId }: TaskInputProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertMarkdown = (type: 'code' | 'list') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const text = content;
    
    let newText = "";
    let cursorOffset = 0;

    switch (type) {
      case 'code':
        newText = text.substring(0, start) + "```\n" + text.substring(start, end) + "\n```" + text.substring(end);
        cursorOffset = 4;
        break;
      case 'list':
        newText = text.substring(0, start) + "- " + text.substring(start, end) + text.substring(end);
        cursorOffset = 2;
        break;
    }

    setContent(newText);
    textareaRef.current.focus();
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
      formData.append("title", content); 
      formData.append("projectId", projectId);
      formData.append("priority", "MEDIUM");
      
      if (image) {
        formData.append("image", image);
      }

      await createTask(formData);

      setContent("");
      setImage(null);
      setIsExpanded(false); 
      toast.success("Tarefa criada!");
      
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
        "relative transition-all duration-300 ease-in-out bg-background border border-border rounded-xl shadow-sm",
        isExpanded ? "ring-2 ring-primary/20 border-primary/50" : "hover:border-primary/30"
    )}>
      
      <div className="p-3 flex flex-col gap-3">
        {/* PREVIEW DA IMAGEM */}
        {image && (
          <div className="relative w-fit group animate-in fade-in zoom-in duration-200">
            <img src={image} alt="Preview" className="h-20 w-auto rounded-lg border border-border shadow-sm object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 shadow-md hover:bg-destructive/90 transition-transform hover:scale-110"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex gap-3 items-start">
           <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-primary mt-0.5 shrink-0 h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-4 w-4" />
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

          {/* Textarea */}
          <div className="flex-1 relative">
            <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsExpanded(true)}
                placeholder={image ? "Adicionar legenda..." : "Adicionar nova tarefa..."}
                className="min-h-[36px] max-h-[200px] resize-none overflow-hidden py-1.5 px-0 bg-transparent border-none focus-visible:ring-0 shadow-none text-sm placeholder:text-muted-foreground/70"
                rows={1}
            />
            
            {/* Toolbar Expandida */}
            {isExpanded && (
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-1">
                    <div className="flex gap-1">
                         <button onClick={() => insertMarkdown('code')} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded text-xs flex items-center gap-1 transition-colors" title="Código">
                            <Code className="h-3.5 w-3.5" />
                         </button>
                         <button onClick={() => insertMarkdown('list')} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded text-xs flex items-center gap-1 transition-colors" title="Lista">
                            <List className="h-3.5 w-3.5" />
                         </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground hidden sm:block">
                            <strong>Enter</strong> para salvar
                        </span>

                        <Button
                            onClick={() => handleSubmit()}
                            size="sm"
                            disabled={isUploading || (!content.trim() && !image)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3 rounded-lg text-xs"
                        >
                            {isUploading ? "Salvando..." : "Criar"}
                        </Button>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Botão Fechar (Mobile/UX) */}
      {isExpanded && (
          <button 
            onClick={() => setIsExpanded(false)} 
            className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground p-1 transition-colors"
          >
              <X className="h-3.5 w-3.5" />
          </button>
      )}
    </div>
  );
}