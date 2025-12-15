"use client";

import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { updateAISettings } from "@/app/(dashboard)/settings/actions"; 
import { toast } from "sonner";
import { Bot, Zap, Sparkles, Cloud, HardDrive, Cpu, Check, Box } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  currentProvider: string;
  currentModel: string;
}

// Configuração centralizada
const MODEL_OPTIONS = [
    {
        category: "Nuvem (Alta Performance)",
        items: [
            { value: "groq:llama-3.3-70b-versatile", label: "Groq (Llama 3.3)", icon: Zap, color: "text-orange-500" },
            { value: "google:gemini-1.5-flash", label: "Gemini Flash", icon: Sparkles, color: "text-blue-500" },
            { value: "openai:gpt-4-turbo", label: "GPT-4 Turbo", icon: Cloud, color: "text-emerald-500" },
            { value: "openai:gpt-3.5-turbo", label: "GPT-3.5 Turbo", icon: Cloud, color: "text-emerald-500" },
        ]
    },
    {
        category: "Local (Privacidade Total)",
        items: [
            { value: "ollama:llama3", label: "Llama 3 (Local)", icon: HardDrive, color: "text-muted-foreground" },
            { value: "ollama:mistral", label: "Mistral (Local)", icon: HardDrive, color: "text-muted-foreground" },
            { value: "ollama:deepseek-r1", label: "DeepSeek (Local)", icon: Box, color: "text-muted-foreground" },
        ]
    }
];

export function ModelSelector({ currentProvider, currentModel }: ModelSelectorProps) {
  const initialValue = currentProvider && currentModel 
    ? `${currentProvider}:${currentModel}` 
    : "ollama:llama3";

  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const selectedOption = MODEL_OPTIONS.flatMap(g => g.items).find(i => i.value === value);
  const SelectedIcon = selectedOption?.icon || Bot;

  const handleValueChange = async (newValue: string) => {
    setValue(newValue);
    setIsPending(true);
    
    const [newProvider, newModel] = newValue.split(":");
    const formData = new FormData();
    formData.append("aiProvider", newProvider);
    formData.append("aiModel", newModel);
    
    try {
        await updateAISettings(formData);
        toast.success(`Modelo alterado para ${selectedOption?.label || newProvider}`);
    } catch (error) {
        toast.error("Erro ao salvar preferência.");
        setValue(initialValue); 
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={isPending}>
      <SelectTrigger 
        className={cn(
            "h-9 px-3 text-xs font-medium border-border bg-background transition-all focus:ring-primary/20",
            "hover:border-primary/30 hover:bg-muted/30",
            "min-w-[180px] w-auto shadow-sm"
        )}
      >
        <div className="flex items-center gap-2.5">
           <div className={cn("p-0.5 rounded-sm bg-muted/50", selectedOption?.color)}>
                <SelectedIcon className="h-3.5 w-3.5" />
           </div>
           <span className="truncate text-foreground">
               {selectedOption?.label || "Selecione a IA"}
           </span>
        </div>
      </SelectTrigger>
      
      <SelectContent className="max-h-[400px]">
        {MODEL_OPTIONS.map((group) => (
            <div key={group.category}>
                <div className="px-2 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    {group.category}
                </div>
                {group.items.map((item) => (
                    <SelectItem 
                        key={item.value} 
                        value={item.value} 
                        className="text-xs cursor-pointer focus:bg-primary/5 focus:text-primary pl-2"
                    >
                        <div className="flex items-center gap-2.5 w-full">
                            <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                            <span className="flex-1">{item.label}</span>
                        </div>
                    </SelectItem>
                ))}
            </div>
        ))}
      </SelectContent>
    </Select>
  );
}