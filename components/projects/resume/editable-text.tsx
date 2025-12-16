"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
  // Limitamos as tags permitidas para garantir a tipagem correta
  tagName?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
}

export function EditableText({
  value,
  onChange,
  className,
  placeholder = "Clique duplo para editar",
  multiline = false,
  tagName = "p",
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  
  // Ref genérica que aceita tanto Input quanto TextArea
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Sincroniza o valor local se a prop mudar externamente
  useEffect(() => {
    setTempValue(value);
  }, [value]);

  // Foco automático e cursor no final ao entrar no modo de edição
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Tenta colocar o cursor no final (para inputs de texto)
      if ('setSelectionRange' in inputRef.current) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, [isEditing]);

  // Auto-resize para Textarea
  useEffect(() => {
    if (isEditing && multiline && inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = inputRef.current.scrollHeight + "px";
    }
  }, [tempValue, isEditing, multiline]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim() !== value) {
      onChange(tempValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      // Cancela a edição e reverte o valor
      setTempValue(value);
      setIsEditing(false);
    }
  };

  // Renderização do Input (Edição)
  if (isEditing) {
    const commonClasses = cn(
      "w-full bg-transparent outline-none ring-1 ring-primary/30 rounded px-1 -ml-1 text-inherit font-inherit leading-inherit resize-none overflow-hidden",
      className
    );

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={commonClasses}
          rows={1}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={commonClasses}
      />
    );
  }

  // Renderização do Texto (Visualização)
  const Tag = tagName as React.ElementType; // Tipagem correta para JSX dinâmico

  return (
    <Tag
      onDoubleClick={() => setIsEditing(true)}
      title="Clique duas vezes para editar"
      className={cn(
        "cursor-text transition-colors rounded px-1 -ml-1 border border-transparent hover:border-dashed hover:border-primary/30 hover:bg-primary/5",
        // Estilo para campo vazio (Placeholder visual)
        !value && "text-muted-foreground/60 italic min-w-[100px] inline-block",
        className
      )}
    >
      {value || placeholder}
    </Tag>
  );
}