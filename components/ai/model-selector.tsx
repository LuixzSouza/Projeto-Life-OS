"use client";

import { useState } from "react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
} from "@/components/ui/select";
import { updateAISettings } from "@/app/(dashboard)/settings/actions"; 
import { toast } from "sonner";
import { Bot, Zap, Sparkles, Cloud, HardDrive, Cpu, Box, Brain, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * 1. CONFIGURAÇÃO DE MODELOS (COM BADGES TÁTICAS)
 * -----------------------------------------------------------------------------------------------*/

interface ModelSelectorProps {
  currentProvider: string;
  currentModel: string;
}

const MODEL_OPTIONS = [
  {
    category: "Cloud_Sync (APIs Oficiais)",
    items: [
      { value: "groq:llama-3.3-70b-versatile", label: "Llama 3.3 (Groq)", icon: Zap, color: "text-orange-500", badge: "FAST" },
      { value: "deepseek:deepseek-reasoner", label: "DeepSeek R1", icon: Brain, color: "text-indigo-500", badge: "REASON" },
      { value: "openai:gpt-4-turbo", label: "GPT-4 Turbo", icon: Cloud, color: "text-emerald-500", badge: "SMART" },
      { value: "google:gemini-1.5-flash", label: "Gemini 1.5", icon: Sparkles, color: "text-blue-500", badge: "VISION" },
      { value: "mistral:mistral-large-latest", label: "Mistral Large", icon: Wind, color: "text-yellow-500", badge: "PRO" },
    ]
  },
  {
    category: "Offline_Mode (Via Ollama)",
    items: [
      { value: "ollama:deepseek-r1", label: "DeepSeek (Local)", icon: Box, color: "text-zinc-500 dark:text-zinc-400", badge: "LOCAL" },
      { value: "ollama:llama3", label: "Llama 3 (Local)", icon: HardDrive, color: "text-zinc-500 dark:text-zinc-400", badge: "8B" },
      { value: "ollama:mistral", label: "Mistral (Local)", icon: HardDrive, color: "text-zinc-500 dark:text-zinc-400", badge: "7B" },
    ]
  }
];

/* -------------------------------------------------------------------------------------------------
 * 2. COMPONENTE PRINCIPAL
 * -----------------------------------------------------------------------------------------------*/

export function ModelSelector({ currentProvider, currentModel }: ModelSelectorProps) {
  const initialValue = currentProvider && currentModel 
    ? `${currentProvider}:${currentModel}` 
    : "ollama:llama3";

  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const selectedOption = MODEL_OPTIONS.flatMap(g => g.items).find(i => i.value === value);
  
  const SelectedIcon = isPending ? Cpu : (selectedOption?.icon || Bot);
  const selectedColor = isPending ? "text-primary" : selectedOption?.color;

  const handleValueChange = async (newValue: string) => {
    setValue(newValue);
    setIsPending(true);
    
    const [newProvider, newModel] = newValue.split(":");
    const formData = new FormData();
    formData.append("aiProvider", newProvider);
    formData.append("aiModel", newModel);
    
    try {
        await updateAISettings(formData);
        toast.success(`Rota neural alterada para: ${selectedOption?.label || newProvider.toUpperCase()}`);
    } catch (error) {
        toast.error("Falha ao realocar núcleo de processamento.");
        setValue(initialValue); 
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={isPending}>
      
      {/* TRIGGER (BOTÃO VISÍVEL NO CHAT) */}
      <SelectTrigger 
        className={cn(
            "h-9 px-4 text-[11px] font-black uppercase tracking-widest transition-all duration-300",
            "bg-background/80 backdrop-blur-md border border-border/40 rounded-full",
            "focus:ring-2 focus:ring-primary/20 hover:border-primary/40 hover:bg-accent/50 shadow-sm",
            "min-w-[210px] w-auto data-[state=open]:border-primary/50",
            isPending && "opacity-80 cursor-wait"
        )}
      >
        <div className="flex items-center gap-2.5 w-full">
           <div className={cn("flex items-center justify-center transition-colors", selectedColor)}>
                <SelectedIcon className={cn("h-4 w-4", isPending && "animate-spin")} />
           </div>
           <span className="truncate text-foreground/90 flex-1 text-left">
               {isPending ? "Alocando..." : (selectedOption?.label || "Selecione a IA")}
           </span>
           {/* Badge no Trigger */}
           {!isPending && selectedOption?.badge && (
               <span className={cn(
                   "text-[8px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground/80 border border-border/40",
                   selectedOption.color.replace("text-", "bg-").replace("500", "500/10")
               )}>
                   {selectedOption.badge}
               </span>
           )}
        </div>
      </SelectTrigger>
      
      {/* DROPDOWN (MODAL DE SELEÇÃO) */}
      <SelectContent 
        className="max-h-[450px] rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-2xl min-w-[240px]"
      >
        {MODEL_OPTIONS.map((group, groupIdx) => (
            <div key={group.category} className={cn(groupIdx > 0 && "mt-2 pt-2 border-t border-border/20")}>
                
                <div className="px-3 py-2 text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">
                    {group.category}
                </div>
                
                <div className="space-y-0.5 px-1">
                  {group.items.map((item) => (
                      <SelectItem 
                          key={item.value} 
                          value={item.value} 
                          className={cn(
                            "text-xs font-bold rounded-xl cursor-pointer transition-colors py-2.5 pr-4",
                            "focus:bg-accent focus:text-accent-foreground data-[state=checked]:bg-primary/10"
                          )}
                      >
                          <div className="flex items-center gap-3 w-full pl-1">
                              <div className={cn("p-1.5 rounded-md bg-background shadow-sm border border-border/20", item.color)}>
                                <item.icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="flex-1 uppercase tracking-wider text-[10px]">
                                {item.label}
                              </span>
                              {/* Badge na Lista */}
                              <span className="text-[8px] font-black tracking-widest px-1.5 py-0.5 rounded border border-border/30 bg-background/50 text-muted-foreground">
                                  {item.badge}
                              </span>
                          </div>
                      </SelectItem>
                  ))}
                </div>
            </div>
        ))}
      </SelectContent>
    </Select>
  );
}