'use client';

import { Plus, Image as ImageIcon, X, Paperclip, Code, List, Sparkles, Keyboard, Check, Loader2, Zap, Bold, Italic, Link as LinkIcon } from "lucide-react";
import { createTask } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface TaskInputProps {
  projectId: string;
}

type MarkdownType = 'code' | 'list' | 'bold' | 'italic' | 'link';
type InputMode = 'minimal' | 'expanded' | 'focus';

export function TaskInput({ projectId }: TaskInputProps) {
  const [content, setContent] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputMode, setInputMode] = useState<InputMode>('minimal');
  const [characterCount, setCharacterCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isProcessingPaste, setIsProcessingPaste] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Função para converter HTML/rich text em markdown limpo
  const convertHtmlToMarkdown = useCallback((html: string): string => {
    try {
      // Criar um div temporário para parse do HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // Remove scripts, styles, comentários
      const scripts = tempDiv.querySelectorAll('script, style, noscript, iframe');
      scripts.forEach(el => el.remove());
      
      // Converte elementos comuns para markdown
      // Títulos
      tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el, i) => {
        const level = parseInt(el.tagName[1]);
        el.outerHTML = `${'#'.repeat(level)} ${el.textContent}\n\n`;
      });
      
      // Negrito
      tempDiv.querySelectorAll('b, strong').forEach(el => {
        el.outerHTML = `**${el.textContent}**`;
      });
      
      // Itálico
      tempDiv.querySelectorAll('i, em').forEach(el => {
        el.outerHTML = `*${el.textContent}*`;
      });
      
      // Links
      tempDiv.querySelectorAll('a').forEach(el => {
        const href = el.getAttribute('href');
        const text = el.textContent;
        if (href && text) {
          el.outerHTML = `[${text}](${href})`;
        }
      });
      
      // Listas
      tempDiv.querySelectorAll('li').forEach(el => {
        el.innerHTML = `- ${el.innerHTML.trim()}`;
      });
      
      // Quebras de linha e parágrafos
      tempDiv.querySelectorAll('p, br').forEach(el => {
        if (el.tagName === 'BR') {
          el.replaceWith('\n');
        } else {
          el.innerHTML = `${el.innerHTML.trim()}\n\n`;
        }
      });
      
      // Código
      tempDiv.querySelectorAll('code').forEach(el => {
        if (el.parentElement?.tagName === 'PRE') {
          el.outerHTML = `\`\`\`\n${el.textContent}\n\`\`\`\n`;
        } else {
          el.outerHTML = `\`${el.textContent}\``;
        }
      });
      
      // Remove tags vazias e limpa espaços extras
      let result = tempDiv.textContent || html;
      
      // Limpeza final
      result = result
        .replace(/\n{3,}/g, '\n\n') // Máximo 2 quebras seguidas
        .replace(/\s{2,}/g, ' ') // Remove múltiplos espaços
        .trim();
      
      return result;
    } catch (error) {
      console.error('Erro ao converter HTML:', error);
      // Fallback: extrair apenas texto
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent?.replace(/\s{2,}/g, ' ').trim() || html;
    }
  }, []);

  // Processar conteúdo colado
  const processPastedContent = useCallback(async (text: string, html: string) => {
    setIsProcessingPaste(true);
    
    try {
      let cleanedContent = text;
      
      // Se tiver HTML, converte para markdown
      if (html && html !== text) {
        cleanedContent = convertHtmlToMarkdown(html);
      }
      
      // Limpa formatação extra
      cleanedContent = cleanedContent
        .replace(/<\/?[^>]+(>|$)/g, '') // Remove tags HTML restantes
        .replace(/[\r\n]+/g, '\n') // Normaliza quebras de linha
        .replace(/[ \t]+/g, ' ') // Normaliza espaços
        .trim();
      
      // Insere no textarea
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = content.substring(0, start);
        const after = content.substring(end);
        
        const newContent = before + cleanedContent + after;
        setContent(newContent);
        
        // Move cursor para o final do conteúdo inserido
        setTimeout(() => {
          const newPosition = start + cleanedContent.length;
          textarea.setSelectionRange(newPosition, newPosition);
          textarea.focus();
        }, 0);
      }
      
      toast.success("Conteúdo formatado colado com sucesso!");
    } catch (error) {
      console.error('Erro ao processar conteúdo colado:', error);
      toast.error("Erro ao processar conteúdo. O conteúdo original foi mantido.");
    } finally {
      setIsProcessingPaste(false);
    }
  }, [content, convertHtmlToMarkdown]);

  // Handler de paste aprimorado
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    // Primeiro verifica se tem imagem
    const items = Array.from(clipboard.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        handleFile(file);
        return;
      }
    }

    // Processa texto/HTML
    const text = clipboard.getData('text/plain');
    const html = clipboard.getData('text/html');
    
    if (text || html) {
      processPastedContent(text, html);
    }
  }, [processPastedContent]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const newHeight = Math.min(textarea.scrollHeight, 160);
    textarea.style.height = `${newHeight}px`;
  }, [content]);

  // Update character count
  useEffect(() => {
    setCharacterCount(content.length);
  }, [content]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (content.trim() === '' && !image) {
          setInputMode('minimal');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [content, image]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas arquivos de imagem.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter menos de 5MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    
    reader.onloadstart = () => {
      toast.loading("Processando imagem...");
    };
    
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      toast.success("Imagem anexada com sucesso!");
      setInputMode('expanded');
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      toast.error("Erro ao carregar a imagem.");
      setIsUploading(false);
    };
    
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      if (inputMode === 'minimal') {
        setInputMode('expanded');
      } else {
        handleSubmit();
      }
    }

    if (e.key === "Escape") {
      if (content.trim() === '' && !image) {
        setInputMode('minimal');
      }
      textareaRef.current?.blur();
    }
  };

  const insertMarkdown = (type: MarkdownType) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
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
      case 'bold':
        newText = text.substring(0, start) + "**" + text.substring(start, end) + "**" + text.substring(end);
        cursorOffset = 2;
        break;
      case 'italic':
        newText = text.substring(0, start) + "*" + text.substring(start, end) + "*" + text.substring(end);
        cursorOffset = 1;
        break;
      case 'link':
        newText = text.substring(0, start) + "[text](url)" + text.substring(end);
        cursorOffset = 1;
        break;
    }

    setContent(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + cursorOffset, start + cursorOffset);
      }
    }, 0);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !image) {
      toast.error("Adicione um título ou imagem para criar a tarefa.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", content.trim()); 
      formData.append("projectId", projectId);
      formData.append("priority", "MEDIUM");
      
      if (image) {
        formData.append("image", image);
      }

      await createTask(formData);

      setContent("");
      setImage(null);
      setInputMode('minimal');
      
      toast.success("🎯 Tarefa criada com sucesso!");
      
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.blur();
      }

    } catch (err) {
      console.error(err);
      toast.error("❌ Erro ao criar tarefa. Tente novamente.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        ref={containerRef}
        className={cn(
          "relative transition-all duration-300 ease-out",
          "bg-gradient-to-b from-background via-background to-background/95",
          "border-2 rounded-2xl shadow-lg",
          "hover:shadow-xl hover:shadow-primary/5",
          isFocused && "shadow-xl shadow-primary/10",
          inputMode === 'minimal' 
            ? "min-h-[56px] border-border/50" 
            : "border-primary/40 bg-gradient-to-br from-background to-primary/5"
        )}
        initial={false}
        animate={{
          scale: isFocused ? 1.01 : 1,
          y: isFocused ? -2 : 0,
        }}
      >
        {/* Gradient Border Effect */}
        <div className={cn(
          "absolute inset-0 rounded-2xl pointer-events-none",
          "bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0",
          isFocused && "animate-pulse",
          inputMode !== 'minimal' && "bg-gradient-to-br from-primary/10 via-primary/5 to-primary/0"
        )} />

        <div className="relative p-4 space-y-4">
          {/* IMAGE PREVIEW */}
          <AnimatePresence>
            {image && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                className="relative w-fit group"
              >
                <div className="relative overflow-hidden rounded-xl border-2 border-primary/20 shadow-md">
                  <img 
                    src={image} 
                    alt="Preview" 
                    className="h-32 w-auto object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
                  onClick={() => setImage(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN INPUT AREA */}
          <div className="flex items-start gap-3">
            {/* Attachment Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={image ? "default" : "outline"}
                  className={cn(
                    "h-10 w-10 rounded-xl transition-all duration-200",
                    "border-2 shadow-sm",
                    image 
                      ? "bg-primary text-primary-foreground border-primary" 
                      : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Paperclip className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">Anexar imagem</p>
              </TooltipContent>
            </Tooltip>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = '';
              }}
            />

            {/* Textarea Container */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    setIsFocused(true);
                    setInputMode('expanded');
                  }}
                  onBlur={() => setIsFocused(false)}
                  placeholder={image 
                    ? "Adicionar título à imagem..." 
                    : inputMode === 'minimal' 
                      ? "Digite uma nova tarefa..." 
                      : "Descreva sua tarefa em detalhes..."}
                  className={cn(
                    "min-h-[40px] max-h-[160px] resize-none",
                    "bg-transparent border-0 focus-visible:ring-0 shadow-none",
                    "text-base placeholder:text-muted-foreground/60",
                    "leading-relaxed scrollbar-thin scrollbar-thumb-border",
                    isProcessingPaste && "opacity-50"
                  )}
                  rows={1}
                  disabled={isUploading}
                />
                
                {isProcessingPaste && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>

              {/* EXPANDED TOOLBAR */}
              <AnimatePresence>
                {(inputMode === 'expanded' || image) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    {/* Markdown Toolbar */}
                    <div className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-gradient-to-r from-primary/5 via-primary/5 to-transparent border border-primary/10">
                      <span className="text-xs font-medium text-primary px-2">Formatação:</span>
                      <div className="flex gap-1">
                        {[
                          { type: 'bold' as MarkdownType, label: 'Negrito (Ctrl+B)', icon: <Bold className="h-3 w-3" /> },
                          { type: 'italic' as MarkdownType, label: 'Itálico (Ctrl+I)', icon: <Italic className="h-3 w-3" /> },
                          { type: 'list' as MarkdownType, label: 'Lista', icon: <List className="h-3 w-3" /> },
                          { type: 'code' as MarkdownType, label: 'Código', icon: <Code className="h-3 w-3" /> },
                          { type: 'link' as MarkdownType, label: 'Link', icon: <LinkIcon className="h-3 w-3" /> },
                        ].map((item) => (
                          <Tooltip key={item.type}>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                                onClick={() => insertMarkdown(item.type)}
                                disabled={isUploading}
                              >
                                {item.icon}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                              <p className="text-xs">{item.label}</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    </div>

                    {/* Status Bar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs transition-colors",
                            characterCount > 450 
                              ? "text-red-500 border-red-500/30" 
                              : characterCount > 300
                              ? "text-amber-500 border-amber-500/30"
                              : "text-muted-foreground"
                          )}
                        >
                          {characterCount}/500
                        </Badge>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Keyboard className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd> + 
                            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-1">Enter</kbd> para salvar
                          </span>
                          <span className="sm:hidden">Toque para salvar</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setContent("");
                            setImage(null);
                            setInputMode('minimal');
                          }}
                          disabled={isUploading}
                        >
                          Cancelar
                        </Button>

                        <Button
                          onClick={handleSubmit}
                          size="sm"
                          disabled={isUploading || (!content.trim() && !image)}
                          className={cn(
                            "gap-2 px-4 rounded-lg",
                            "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary",
                            "text-primary-foreground shadow-md hover:shadow-lg",
                            "transition-all duration-200 hover:scale-[1.02]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                        >
                          {isUploading ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" />
                              Criar Tarefa
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MINIMAL MODE FOOTER */}
              {inputMode === 'minimal' && content.trim() === '' && !image && (
                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    <span>Pressione Enter para expandir</span>
                  </div>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => setInputMode('expanded')}
                        disabled={isUploading}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p className="text-xs">Expandir editor</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drag & Drop Overlay */}
        <AnimatePresence>
          {isFocused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, var(--primary)/5 0%, transparent 70%)',
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </TooltipProvider>
  );
}