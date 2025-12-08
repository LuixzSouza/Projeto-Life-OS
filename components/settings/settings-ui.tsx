"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateAISettings, changePassword } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Lock, Cpu } from "lucide-react";
import { Settings } from "@prisma/client"; // 1. Importando tipo oficial do Banco

// 2. Definindo o formato dos dados de estatística
interface StatItem {
  label: string;
  count: number;
  percent: number;
  color: string;
}

interface StorageStats {
  totalItems: number;
  breakdown: StatItem[];
}

// --- FORMULÁRIO DE IA ---
export function AIConfigForm({ settings }: { settings: Settings | null }) {
  const handleSubmit = async (formData: FormData) => {
    await updateAISettings(formData);
    toast.success("Cérebro da IA atualizado!");
  };

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
            <Label>Provedor</Label>
            <select 
                name="aiProvider" 
                defaultValue={settings?.aiProvider || "ollama"} 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI (Nuvem)</option>
            </select>
        </div>
        <div className="space-y-2">
            <Label>Modelo</Label>
            <Input name="aiModel" defaultValue={settings?.aiModel || "llama3"} placeholder="ex: llama3" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Personalidade (System Prompt)</Label>
        <Textarea 
            name="aiPersona" 
            defaultValue={settings?.aiPersona || ""} 
            className="min-h-[100px]" 
            placeholder="Ex: Você é um coach bravo que me cobra resultados..."
        />
        <p className="text-xs text-zinc-500">Defina como a IA deve se comportar com você.</p>
      </div>
      <Button type="submit" className="w-full"><Cpu className="mr-2 h-4 w-4" /> Atualizar Cérebro</Button>
    </form>
  );
}

// --- VISUALIZADOR DE ARMAZENAMENTO ---
export function StorageAnalytics({ stats }: { stats: StorageStats }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <span className="text-sm font-medium text-zinc-500">Total de Registros</span>
         <span className="text-2xl font-bold">{stats.totalItems}</span>
      </div>
      
      <div className="space-y-3">
        {stats.breakdown.map((item) => (
            <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                    <span>{item.label}</span>
                    <span className="text-zinc-500">{item.count} ({item.percent.toFixed(1)}%)</span>
                </div>
                {/* Barra de Progresso Customizada */}
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${item.color} transition-all duration-500`} 
                        style={{ width: `${item.percent}%` }}
                    />
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}

// --- FORMULÁRIO DE SENHA ---
export function SecurityForm() {
    const handleSubmit = async (formData: FormData) => {
        await changePassword(formData);
        toast.success("Senha alterada com segurança.");
    };

    return (
        <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input type="password" name="newPassword" required placeholder="••••••••" />
            </div>
            <Button type="submit" variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                <Lock className="mr-2 h-4 w-4" /> Atualizar Credenciais
            </Button>
        </form>
    );
}