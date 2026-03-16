"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
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
  
  // Usamos Refs específicas e as acessamos com segurança no TypeScript
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing) {
      const activeElement = multiline ? textareaRef.current : inputRef.current;
      if (activeElement) {
        activeElement.focus();
        const length = activeElement.value.length;
        activeElement.setSelectionRange(length, length);
      }
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    if (isEditing && multiline && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [tempValue, isEditing, multiline]);

  const handleBlur = () => {
    setIsEditing(false);
    if (tempValue.trim() !== value) onChange(tempValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === "Escape") {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonClasses = cn(
      "w-full bg-background outline-none ring-2 ring-primary/40 rounded-xl px-3 py-1 shadow-lg text-inherit font-inherit leading-inherit resize-none overflow-hidden",
      className
    );

    return multiline ? (
      <textarea
        ref={textareaRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={commonClasses}
        rows={1}
      />
    ) : (
      <input
        ref={inputRef}
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={commonClasses}
      />
    );
  }

  const Tag = tagName as React.ElementType;

  return (
    <Tag
      onDoubleClick={() => setIsEditing(true)}
      title="Clique duplo para editar"
      className={cn(
        "cursor-text transition-all rounded-xl px-1 border border-transparent hover:border-dashed hover:border-primary/40 hover:bg-primary/5 py-0.5",
        !value && "text-muted-foreground/40 italic min-w-[120px] inline-block bg-muted/20 border-dashed border-border/60",
        className
      )}
    >
      {value || placeholder}
    </Tag>
  );
}