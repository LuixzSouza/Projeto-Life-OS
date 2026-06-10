"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
} from "@/components/ui/select";
import { updateAISettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Bot, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_PROVIDERS } from "@/lib/ai-models";
import type { AIProviderInfo } from "@/lib/ai-models";

/* -------------------------------------------------------------------------------------------------
 * 1. CONFIGURAÇÃO DE MODELOS (derivada do catálogo único em lib/ai-models.ts)
 * -----------------------------------------------------------------------------------------------*/

interface ModelSelectorProps {
  currentProvider: string;
  currentModel: string;
  /** ids de provedores prontos para uso (chave salva/env ou local) — ganham ponto verde. */
  configuredProviders?: string[];
}

function toSelectorItems(providers: AIProviderInfo[]) {
  return providers.flatMap((p) =>
    p.models.map((m) => ({
      value: `${p.id}:${m.value}`,
      label: m.label,
      icon: m.icon ?? p.icon,
      color: p.color,
      badge: m.badge,
    }))
  );
}

const MODEL_OPTIONS = [
  {
    category: "Cloud_Sync (APIs Oficiais)",
    items: toSelectorItems(AI_PROVIDERS.filter((p) => !p.local)),
  },
  {
    category: "Offline_Mode (Via Ollama)",
    items: toSelectorItems(AI_PROVIDERS.filter((p) => p.local)),
  },
];

/* -------------------------------------------------------------------------------------------------
 * 2. COMPONENTE PRINCIPAL
 * -----------------------------------------------------------------------------------------------*/

export function ModelSelector({ currentProvider, currentModel, configuredProviders }: ModelSelectorProps) {
  const configured = new Set(configuredProviders ?? []);
  const router = useRouter();
  const initialValue = currentProvider && currentModel
    ? `${currentProvider}:${currentModel}`
    : "ollama:llama3.1";

  const [value, setValue] = useState(initialValue);
  const [isPending, setIsPending] = useState(false);

  const allOptions = MODEL_OPTIONS.flatMap(g => g.items);
  const selectedOption = allOptions.find(i => i.value === value);
  // Modelo customizado (definido nas Configurações) que não está na lista:
  // mostra "provider · model" em vez de um trigger vazio/placeholder.
  const customLabel = !selectedOption && value.includes(":")
    ? value.replace(":", " · ")
    : null;

  const SelectedIcon = isPending ? Cpu : (selectedOption?.icon || Bot);
  const selectedColor = isPending ? "text-primary" : selectedOption?.color;

  const handleValueChange = async (newValue: string) => {
    const previous = value;
    // O rótulo do toast vem do NOVO valor (não do estado anterior do render).
    const newOption = allOptions.find(i => i.value === newValue);
    setValue(newValue);
    setIsPending(true);

    const [newProvider, newModel] = newValue.split(":");
    const formData = new FormData();
    formData.append("aiProvider", newProvider);
    formData.append("aiModel", newModel);

    try {
        await updateAISettings(formData);
        toast.success(`Rota neural alterada para: ${newOption?.label || newProvider.toUpperCase()}`);
        // Cada IA tem sua própria conversa: limpa o ?id para a página abrir o
        // histórico da IA recém-selecionada (ou um chat vazio se ela não tem).
        router.replace("/ai");
        router.refresh(); // HUD da página (provedor/contexto) reflete na hora
    } catch {
        toast.error("Falha ao realocar núcleo de processamento.");
        setValue(previous);
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
               {isPending ? "Alocando..." : (selectedOption?.label || customLabel || "Selecione a IA")}
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
                              {/* Status: chave configurada (verde) ou pendente (apagado) */}
                              <span
                                title={configured.has(item.value.split(":")[0]) ? "Pronta para usar" : "Sem chave configurada"}
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full shrink-0",
                                  configured.has(item.value.split(":")[0])
                                    ? "bg-emerald-500 shadow-[0_0_5px_#10b981]"
                                    : "bg-muted-foreground/25"
                                )}
                              />
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