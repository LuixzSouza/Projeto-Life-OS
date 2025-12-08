'use client';

import { Plus, Image as ImageIcon, X } from "lucide-react";
import { createTask } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { useRef, useState, useEffect } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface TaskInputProps {
  projectId: string;
}

export function TaskInput({ projectId }: TaskInputProps) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Converte arquivo em base64
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  // Paste handler (mais simples e focado no evento que vem do input)
  const handlePaste = (e: React.ClipboardEvent) => {
    // Evita que o texto ou ícone quebre a linha se o navegador tentar colar algo não processado
    if (e.clipboardData.types.includes('text/plain') && !e.clipboardData.types.includes('Files')) return;

    const clipboard = e.clipboardData;
    if (!clipboard || !clipboard.items) return;

    for (let i = 0; i < clipboard.items.length; i++) {
        const item = clipboard.items[i];
        if (item.type && item.type.indexOf("image") !== -1) {
            const file = item.getAsFile();
            if (file) {
                // Previne a inserção de texto no input para que o setState gerencie
                e.preventDefault(); 
                handleFile(file);
                toast.success("Imagem anexada!");
                break;
            }
        }
    }
  };

  // Handler para input file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Enviar / Criar a Task
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsUploading(true);

    try {
      const tempFormData = new FormData();
      tempFormData.append("title", title);
      tempFormData.append("projectId", projectId);
      
      // *** FIX PRINCIPAL: ENVIAR IMAGEM ***
      if (image) {
        tempFormData.append("image", image);
      }
      
      // Campos Padrão que a Server Action espera
      tempFormData.append("priority", "MEDIUM");
      tempFormData.append("dueDate", ""); 

      await createTask(tempFormData);

      setTitle("");
      setImage(null); // Zera a imagem após o sucesso
      toast.success("Tarefa criada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao criar tarefa.");
    } finally {
      setIsUploading(false);
    }
  };

  // Fallback global desnecessário já que o input tem onPaste e o form tem onSubmit.
  // Mantenha o código limpo, removendo o useEffect global que pode causar conflitos.
  // (O input já está focado e lidará com Ctrl+V)

  return (
    <div className="p-3 border-t bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur-sm">
      {/* Removemos o onPaste do form, deixando apenas o onSubmit, para que o onPaste do Input seja o único a ser disparado */}
      <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
        {/* PREVIEW DA IMAGEM (Aparece acima se existir) */}
        {image && (
          <div className="relative w-fit group">
            <img src={image} alt="Preview" className="h-20 w-auto rounded-lg border shadow-sm object-cover" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-transform hover:scale-110"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="flex gap-2 items-center">
          {/* Botão de Anexo Discreto */}
          <div className="relative">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="text-zinc-400 hover:text-indigo-500"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-5 w-5" />
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>

          {/* Input de Texto */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onPaste={handlePaste} // Ação no Input garante que o Base64 seja processado antes do submit
            placeholder={image ? "Descreva a imagem ou tarefa..." : "Nova tarefa... (Cole uma imagem com Ctrl+V)"}
            className="flex-1 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500"
            autoComplete="off"
          />

          {/* Botão Enviar */}
          <Button
            type="submit"
            size="icon"
            disabled={isUploading || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}