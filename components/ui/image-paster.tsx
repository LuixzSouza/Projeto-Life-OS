"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, X, Upload, Clipboard } from "lucide-react";
import { toast } from "sonner";

interface ImagePasterProps {
  defaultValue?: string | null;
  onImageChange: (base64: string | null) => void;
}

export function ImagePaster({ defaultValue, onImageChange }: ImagePasterProps) {
  const [preview, setPreview] = useState<string | null>(defaultValue || null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Função para converter Arquivo -> Base64
  const convertToBase64 = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onImageChange(base64);
    };
    reader.onerror = (error) => {
      console.error("Erro ao ler imagem: ", error);
      toast.error("Erro ao processar imagem.");
    };
  };

  // 1. Lidar com Colar (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let foundImage = false;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          convertToBase64(file);
          foundImage = true;
          toast.success("Imagem colada da área de transferência!");
        }
      }
    }
    
    if (!foundImage) {
        // Se não for imagem, não faz nada (deixa colar texto normal em outros lugares)
    }
  };

  // 2. Lidar com Upload Manual
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) convertToBase64(file);
  };

  // 3. Remover Imagem
  const handleRemove = () => {
    setPreview(null);
    onImageChange(null);
  };

  return (
    <div className="space-y-2">
      <input type="hidden" name="image" value={preview || ""} />
      
      {!preview ? (
        <div 
            ref={containerRef}
            onPaste={handlePaste}
            className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer relative"
            tabIndex={0} // Permite focar na div para colar
        >
            <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-full">
                <Clipboard className="h-6 w-6 text-zinc-400" />
            </div>
            <div className="text-center">
                <p className="text-sm font-medium">Clique aqui e pressione <kbd className="bg-zinc-200 dark:bg-zinc-700 px-1 rounded">Ctrl + V</kbd></p>
                <p className="text-xs">ou arraste/selecione uma imagem</p>
            </div>
            
            {/* Input Invisível cobrindo tudo para clique funcionar */}
            <input 
                type="file" 
                accept="image/*" 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
            />
        </div>
      ) : (
        <div className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800">
            <img src={preview} alt="Preview" className="w-full max-h-[300px] object-contain bg-zinc-950" />
            <div className="absolute top-2 right-2 flex gap-2">
                <Button 
                    type="button" 
                    variant="destructive" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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