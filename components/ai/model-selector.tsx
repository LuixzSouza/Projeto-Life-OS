"use client";

import { useState, useEffect } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { updateAISettings } from "@/app/(dashboard)/settings/actions"; 
import { toast } from "sonner";
import { Bot, Zap, Sparkles, Cloud, HardDrive, Cpu, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  currentProvider: string;
  currentModel: string;
}

// Configuração centralizada das opções para facilitar a renderização visual
const MODEL_OPTIONS = [
    {
        category: "Nuvem (Rápido & Inteligente)",
        items: [
            { value: "groq:llama-3.3-70b-versatile", label: "Groq (Llama 3.3)", icon: Zap, color: "text-orange-500" },
            { value: "google:gemini-1.5-flash", label: "Gemini Flash", icon: Sparkles, color: "text-blue-500" },
            { value: "openai:gpt-4-turbo", label: "GPT-4 Turbo", icon: Cloud, color: "text-emerald-500" },
            { value: "openai:gpt-3.5-turbo", label: "GPT-3.5 Turbo", icon: Cloud, color: "text-emerald-500" },
        ]
    },
    {
        category: "Local (Privacidade)",
        items: [
            { value: "ollama:llama3", label: "Llama 3 (Local)", icon: HardDrive, color: "text-zinc-500" },
            { value: "ollama:mistral", label: "Mistral (Local)", icon: HardDrive, color: "text-zinc-500" },
        ]
    }
];

export function ModelSelector({ currentProvider, currentModel }: ModelSelectorProps) {
  // Estado local combinando "provider:model" para o Select funcionar
  // Se vier vazio do banco, forçamos um padrão seguro
  const initialValue = currentProvider && currentModel 
    ? `${currentProvider}:${currentModel}` 
    : "ollama:llama3";

  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  // Encontra a opção atual para mostrar o ícone correto no Trigger
  const selectedOption = MODEL_OPTIONS.flatMap(g => g.items).find(i => i.value === value);
  const SelectedIcon = selectedOption?.icon || Bot;

  const handleValueChange = async (newValue: string) => {
    setValue(newValue); // Atualiza UI imediatamente (Optimistic)
    setIsPending(true);
    
    const [newProvider, newModel] = newValue.split(":");

    const formData = new FormData();
    formData.append("aiProvider", newProvider);
    formData.append("aiModel", newModel);
    
    // Preserva a persona atual para não apagar (opcional, dependendo da sua action)
    // formData.append("aiPersona", "..."); 

    try {
        await updateAISettings(formData);
        toast.success(`Cérebro alterado para ${selectedOption?.label || newProvider}`);
    } catch (error) {
        toast.error("Erro ao salvar preferência.");
        // Reverte em caso de erro (opcional)
        setValue(initialValue); 
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={isPending}>
      <SelectTrigger 
        className={cn(
            "h-9 px-3 text-xs font-medium border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all focus:ring-indigo-500/20",
            "hover:border-indigo-200 dark:hover:border-indigo-900",
            "min-w-[180px] w-auto"
        )}
      >
        <div className="flex items-center gap-2">
           <div className={cn("p-0.5 rounded-sm", selectedOption?.color ? "bg-zinc-50 dark:bg-zinc-800" : "")}>
                <SelectedIcon className={cn("h-3.5 w-3.5", selectedOption?.color)} />
           </div>
           <span className="truncate">
               {selectedOption?.label || "Selecione a IA"}
           </span>
        </div>
      </SelectTrigger>
      
      <SelectContent className="max-h-[300px]">
        {MODEL_OPTIONS.map((group) => (
            <div key={group.category}>
                <div className="px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-900/50">
                    {group.category}
                </div>
                {group.items.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs cursor-pointer focus:bg-indigo-50 dark:focus:bg-indigo-900/20 focus:text-indigo-900 dark:focus:text-indigo-100">
                        <div className="flex items-center gap-2.5">
                            <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                            <span>{item.label}</span>
                            {/* Check visual se estiver selecionado */}
                            {value === item.value && <Check className="ml-auto h-3 w-3 text-indigo-600" />}
                        </div>
                    </SelectItem>
                ))}
            </div>
        ))}
      </SelectContent>
    </Select>
  );
}