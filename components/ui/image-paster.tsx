"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Clipboard, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImagePasterProps {
  defaultValue?: string | null;
  onImageChange: (base64: string | null) => void;
}

export function ImagePaster({ defaultValue, onImageChange }: ImagePasterProps) {
  const [preview, setPreview] = useState<string | null>(defaultValue ?? null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* =====================================================
   * Utils
   * ===================================================== */
  const convertToBase64 = (file: File) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);

    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onImageChange(base64);
    };

    reader.onerror = () => {
      toast.error("Erro ao processar imagem.");
    };
  };

  /* =====================================================
   * Handlers
   * ===================================================== */
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let foundImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.includes("image")) {
        const file = items[i].getAsFile();
        if (file) {
          convertToBase64(file);
          toast.success("Imagem colada da área de transferência!");
          foundImage = true;
        }
      }
    }

    if (!foundImage) {
      // Mantém comportamento padrão para outros conteúdos
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) convertToBase64(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
  };

  /* =====================================================
   * Render
   * ===================================================== */
  return (
    <div className="space-y-3">
      <input type="hidden" name="image" value={preview || ""} />

      {!preview ? (
        <div
          ref={containerRef}
          onPaste={handlePaste}
          tabIndex={0}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center",
            "border-border bg-gradient-to-b from-background to-muted/40",
            "hover:border-primary/40 hover:bg-primary/5 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            "cursor-pointer"
          )}
        >
          <div className="rounded-full bg-primary/10 p-3">
            <Clipboard className="h-6 w-6 text-primary" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Clique e pressione{" "}
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                Ctrl + V
              </kbd>
            </p>
            <p className="text-xs text-muted-foreground">
              ou selecione / arraste uma imagem
            </p>
          </div>

          {/* Input invisível */}
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-background shadow-sm">
          <img
            src={preview}
            alt="Preview"
            className="max-h-[300px] w-full bg-muted object-contain"
          />

          <div className="absolute right-2 top-2 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="h-8 w-8"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
