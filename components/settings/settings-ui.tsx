"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAISettings, changePassword } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Lock, Cpu, Bot, Cloud, HardDrive, ShieldCheck, KeyRound, Save } from "lucide-react";
import { Settings } from "@prisma/client"; 

// --- TYPES ---
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

// --- AI CONFIGURATION FORM ---
export function AIConfigForm({ settings }: { settings: Settings | null }) {
    const [provider, setProvider] = useState(settings?.aiProvider || "ollama");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await updateAISettings(formData);
            toast.success("Cérebro da IA atualizado com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar configurações.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className="space-y-8">
            
            {/* 1. Provedor de IA (Visual Selection) */}
            <div className="space-y-4">
                <Label className="text-base font-semibold">Onde a IA vai rodar?</Label>
                <RadioGroup 
                    name="aiProvider" 
                    defaultValue={provider} 
                    onValueChange={setProvider}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    <div>
                        <RadioGroupItem value="ollama" id="ollama" className="peer sr-only" />
                        <Label
                            htmlFor="ollama"
                            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-indigo-600 [&:has([data-state=checked])]:border-indigo-600 cursor-pointer transition-all h-full"
                        >
                            <HardDrive className="mb-3 h-8 w-8 text-zinc-500 peer-data-[state=checked]:text-indigo-600" />
                            <div className="text-center space-y-1">
                                <span className="font-semibold text-base">Local (Ollama)</span>
                                <p className="text-xs text-muted-foreground">
                                    Privacidade total. Roda no seu PC. Requer hardware.
                                </p>
                            </div>
                        </Label>
                    </div>

                    <div>
                        <RadioGroupItem value="openai" id="openai" className="peer sr-only" />
                        <Label
                            htmlFor="openai"
                            className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-emerald-600 [&:has([data-state=checked])]:border-emerald-600 cursor-pointer transition-all h-full"
                        >
                            <Cloud className="mb-3 h-8 w-8 text-zinc-500 peer-data-[state=checked]:text-emerald-600" />
                            <div className="text-center space-y-1">
                                <span className="font-semibold text-base">Nuvem (OpenAI)</span>
                                <p className="text-xs text-muted-foreground">
                                    Mais inteligência, mas requer chave de API paga.
                                </p>
                            </div>
                        </Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* 2. Modelo */}
                <div className="space-y-3">
                    <Label htmlFor="aiModel" className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-indigo-500" /> Modelo
                    </Label>
                    <Input 
                        id="aiModel"
                        name="aiModel" 
                        defaultValue={settings?.aiModel || "llama3"} 
                        placeholder={provider === 'ollama' ? "ex: llama3, mistral" : "ex: gpt-4-turbo"} 
                        className="bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                    />
                    <p className="text-[11px] text-zinc-400">
                        {provider === 'ollama' 
                            ? "Certifique-se que você baixou este modelo no terminal (`ollama pull llama3`)." 
                            : "Nome do modelo oficial da OpenAI."}
                    </p>
                </div>

                {/* 3. API Key (Condicional - Apenas Visual por enquanto se for OpenAI) */}
                {provider === 'openai' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                        <Label htmlFor="apiKey" className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-emerald-500" /> API Key
                        </Label>
                        <Input 
                            id="apiKey"
                            type="password"
                            placeholder="sk-..." 
                            disabled // Placeholder logic since we don't save API keys in this demo form directly yet
                            className="bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
                        />
                         <p className="text-[11px] text-zinc-400">Gerenciado via variáveis de ambiente (.env).</p>
                    </div>
                )}
            </div>

            {/* 4. Personalidade */}
            <div className="space-y-3">
                <Label htmlFor="aiPersona" className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4 text-purple-500" /> Personalidade (System Prompt)
                </Label>
                <div className="relative">
                    <Textarea 
                        id="aiPersona"
                        name="aiPersona" 
                        defaultValue={settings?.aiPersona || ""} 
                        className="min-h-[140px] bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 leading-relaxed p-4" 
                        placeholder="Ex: Você é um assistente focado em produtividade extrema. Responda de forma curta, direta e motivadora..."
                    />
                    <div className="absolute bottom-3 right-3 text-[10px] text-zinc-400 bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-100 dark:border-zinc-800">
                        Define o &quot;tom de voz&quot;
                    </div>
                </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 h-11">
                {isLoading ? (
                    <span className="flex items-center gap-2">Salvando...</span>
                ) : (
                    <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Salvar Configurações</span>
                )}
            </Button>
        </form>
    );
}

// --- VISUALIZADOR DE ARMAZENAMENTO (Clean & Modern) ---
export function StorageAnalytics({ stats }: { stats: StorageStats }) {
    return (
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm bg-zinc-50/30 dark:bg-zinc-900/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                    <span>Uso do Banco de Dados</span>
                    <span className="text-sm font-normal text-zinc-500 bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700">
                        Total: <span className="font-bold text-zinc-900 dark:text-zinc-100">{stats.totalItems}</span> items
                    </span>
                </CardTitle>
                <CardDescription>Distribuição dos seus dados no Life OS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                {/* Barra de Progresso Segmentada (Visual Mac OS style) */}
                <div className="h-4 w-full flex rounded-full overflow-hidden shadow-inner bg-zinc-100 dark:bg-zinc-800">
                    {stats.breakdown.map((item, idx) => (
                        <div 
                            key={idx}
                            className={`h-full ${item.color}`}
                            style={{ width: `${item.percent}%` }}
                            title={`${item.label}: ${item.count}`}
                        />
                    ))}
                </div>

                {/* Legenda em Grid */}
                <div className="grid grid-cols-2 gap-4">
                    {stats.breakdown.map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-700">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">{item.label}</span>
                            </div>
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-200">
                                {item.count} <span className="text-zinc-400 font-normal">({item.percent.toFixed(0)}%)</span>
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// --- FORMULÁRIO DE SEGURANÇA ---
export function SecurityForm() {
    const handleSubmit = async (formData: FormData) => {
        await changePassword(formData);
        toast.success("Credenciais atualizadas.");
    };

    return (
        <Card className="border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/5">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400 text-base">
                    <ShieldCheck className="h-5 w-5" /> Área de Segurança
                </CardTitle>
                <CardDescription>Gerencie o acesso à sua conta.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
                        <Label htmlFor="newPassword">Nova Senha</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input 
                                id="newPassword" 
                                type="password" 
                                name="newPassword" 
                                required 
                                placeholder="••••••••" 
                                className="pl-9 bg-white dark:bg-zinc-900 border-red-100 dark:border-red-900/30 focus-visible:ring-red-500"
                            />
                        </div>
                    </div>
                    <Button type="submit" variant="destructive" className="w-full shadow-sm">
                        Atualizar Senha Mestra
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}