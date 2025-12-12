"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateAISettings, changePassword } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { 
    Lock, 
    Cpu, 
    Bot, 
    Cloud, 
    HardDrive, 
    KeyRound, 
    Save, 
    Database,
    Zap,
    Sparkles
} from "lucide-react";
import { Settings } from "@prisma/client"; 

// --- TYPES ---
export interface StatItem {
    label: string;
    count: number;
    percent: number;
    color: string;
}

export interface StorageStats {
    totalItems: number;
    breakdown: StatItem[];
}

// Interface para as props do Card de Provedor
interface ProviderCardProps {
    value: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    active: boolean;
}

// ============================================================================
// 1. CONFIGURAÇÃO DE INTELIGÊNCIA ARTIFICIAL (COM API KEYS)
// ============================================================================
export function AIConfigForm({ settings }: { settings: Settings | null }) {
    // Estado para controlar qual provedor está selecionado e mostrar o input correto
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
            
            {/* SELETOR DE PROVEDOR */}
            <div className="space-y-4">
                <Label className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Onde a IA vai rodar?
                </Label>
                <RadioGroup 
                    name="aiProvider" 
                    defaultValue={provider} 
                    onValueChange={setProvider}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {/* OLLAMA */}
                    <ProviderCard 
                        value="ollama" 
                        icon={<HardDrive className="mb-3 h-6 w-6" />} 
                        title="Local (Ollama)" 
                        desc="Privacidade total. Requer PC potente."
                        active={provider === 'ollama'}
                    />
                    
                    {/* GROQ */}
                    <ProviderCard 
                        value="groq" 
                        icon={<Zap className="mb-3 h-6 w-6" />} 
                        title="Groq (Cloud)" 
                        desc="Ultra rápido. Grátis (Beta)."
                        active={provider === 'groq'}
                    />

                    {/* OPENAI */}
                    <ProviderCard 
                        value="openai" 
                        icon={<Cloud className="mb-3 h-6 w-6" />} 
                        title="OpenAI (GPT)" 
                        desc="O mais inteligente. Pago."
                        active={provider === 'openai'}
                    />

                    {/* GOOGLE */}
                    <ProviderCard 
                        value="google" 
                        icon={<Sparkles className="mb-3 h-6 w-6" />} 
                        title="Google (Gemini)" 
                        desc="Balanceado e multimodal."
                        active={provider === 'google'}
                    />
                </RadioGroup>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                
                {/* 1. MODELO */}
                <div className="space-y-3">
                    <Label htmlFor="aiModel" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <Bot className="h-4 w-4 text-indigo-500" /> Modelo Técnico
                    </Label>
                    <Input 
                        id="aiModel"
                        name="aiModel" 
                        defaultValue={settings?.aiModel || "llama3"} 
                        placeholder={provider === 'ollama' ? "ex: llama3" : provider === 'openai' ? "ex: gpt-4-turbo" : "ex: llama3-70b-8192"} 
                        className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                    />
                    <p className="text-[11px] text-zinc-400">
                        Nome exato do modelo na API ou no Ollama.
                    </p>
                </div>

                {/* 2. API KEY (DINÂMICO) */}
                <div className="space-y-3">
                    <Label htmlFor="apiKey" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                        <KeyRound className="h-4 w-4 text-emerald-500" /> Chave de Acesso (API Key)
                    </Label>
                    
                    {provider === 'ollama' && (
                        <div className="h-10 flex items-center px-3 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-zinc-500 text-sm italic">
                            Não necessário para Ollama local.
                        </div>
                    )}

                    {provider === 'openai' && (
                        <Input 
                            name="openaiKey" 
                            type="password" 
                            defaultValue={settings?.openaiKey || ""} 
                            placeholder="sk-..." 
                            className="bg-white dark:bg-zinc-950 border-emerald-200 dark:border-emerald-900/30 focus-visible:ring-emerald-500"
                        />
                    )}

                    {provider === 'groq' && (
                        <Input 
                            name="groqKey" 
                            type="password" 
                            defaultValue={settings?.groqKey || ""} 
                            placeholder="gsk_..." 
                            className="bg-white dark:bg-zinc-950 border-orange-200 dark:border-orange-900/30 focus-visible:ring-orange-500"
                        />
                    )}

                    {provider === 'google' && (
                        <Input 
                            name="googleKey" 
                            type="password" 
                            defaultValue={settings?.googleKey || ""} 
                            placeholder="AIza..." 
                            className="bg-white dark:bg-zinc-950 border-blue-200 dark:border-blue-900/30 focus-visible:ring-blue-500"
                        />
                    )}

                    {provider !== 'ollama' && (
                        <p className="text-[11px] text-zinc-400">
                            Sua chave é criptografada e salva apenas no seu banco local.
                        </p>
                    )}
                </div>
            </div>

            {/* PERSONALIDADE */}
            <div className="space-y-3">
                <Label htmlFor="aiPersona" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <Cpu className="h-4 w-4 text-purple-500" /> Personalidade (System Prompt)
                </Label>
                <div className="relative">
                    <Textarea 
                        id="aiPersona"
                        name="aiPersona" 
                        defaultValue={settings?.aiPersona || ""} 
                        className="min-h-[120px] bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 leading-relaxed p-4 resize-none" 
                        placeholder="Ex: Você é um assistente focado em produtividade extrema. Responda de forma curta, direta e motivadora..."
                    />
                </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md">
                {isLoading ? (
                    <span className="flex items-center gap-2">Salvando...</span>
                ) : (
                    <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Salvar Configurações</span>
                )}
            </Button>
        </form>
    );
}

// Helper Component Tipado Corretamente
function ProviderCard({ value, icon, title, desc, active }: ProviderCardProps) {
    return (
        <div>
            <RadioGroupItem value={value} id={value} className="peer sr-only" />
            <Label
                htmlFor={value}
                className={`flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all h-full text-center ${
                    active 
                    ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" 
                    : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
            >
                <div className={active ? "text-indigo-600" : "text-zinc-400"}>{icon}</div>
                <div className="space-y-1">
                    <span className={`font-semibold text-sm ${active ? "text-indigo-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"}`}>
                        {title}
                    </span>
                    <p className={`text-[10px] ${active ? "text-indigo-700/70 dark:text-indigo-300/70" : "text-zinc-500"}`}>
                        {desc}
                    </p>
                </div>
            </Label>
        </div>
    )
}

// ============================================================================
// 2. ANALYTICS DE ARMAZENAMENTO
// ============================================================================
export function StorageAnalytics({ stats }: { stats: StorageStats }) {
    return (
        <div className="space-y-6">
            {/* Header com Total */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                        <Database className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-zinc-500">Total de Registros</p>
                        <h4 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalItems}</h4>
                    </div>
                </div>
                <div className="text-right hidden sm:block">
                    <p className="text-xs text-zinc-400">Banco de Dados Local</p>
                    <p className="text-xs font-mono text-zinc-500">SQLite / MySQL</p>
                </div>
            </div>

            {/* Barra de Progresso Segmentada */}
            <div className="space-y-2">
                <div className="h-4 w-full flex rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700">
                    {stats.breakdown.map((item, idx) => (
                        <div 
                            key={idx}
                            className={`h-full ${item.color} transition-all duration-500`}
                            style={{ width: `${Math.max(item.percent, 2)}%` }} // Garante que itens pequenos apareçam
                            title={`${item.label}: ${item.count}`}
                        />
                    ))}
                </div>
            </div>

            {/* Legenda em Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {stats.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${item.color}`} />
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                        </div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                            {item.count}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// 3. FORMULÁRIO DE SEGURANÇA
// ============================================================================
export function SecurityForm() {
    const handleSubmit = async (formData: FormData) => {
        await changePassword(formData);
        toast.success("Credenciais atualizadas.");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div>
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Alteração Sensível</h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-500/80 mt-1">
                        Ao alterar sua senha mestra, você será desconectado de todas as sessões ativas imediatamente.
                    </p>
                </div>
            </div>

            <form action={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                        <Input 
                            id="newPassword" 
                            type="password" 
                            name="newPassword" 
                            required 
                            placeholder="Mínimo 8 caracteres" 
                            className="pl-9 bg-white dark:bg-zinc-950"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700 shadow-sm">
                        Atualizar Credenciais
                    </Button>
                </div>
            </form>
        </div>
    );
}

// Helper componente visual para separar seções
function Separator() {
    return <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 my-2" />;
}