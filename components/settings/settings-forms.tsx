"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { updateAISettings, changePassword, updateStoragePath } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { 
    Lock, Cpu, Bot, Cloud, HardDrive, KeyRound, Save, 
    Database, Zap, Sparkles, AlertTriangle, FolderInput, 
    CheckCircle2, Server, ShieldCheck
} from "lucide-react";
import { Settings } from "@prisma/client"; 
import { cn } from "@/lib/utils";
import { FolderPicker } from "@/components/settings/folder-picker"; // Certifique-se que o FolderPicker está criado

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
    disk?: {
        path: string;
        total: string;
        used: string;
        free: string;
        percent: number;
    };
}

interface ProviderCardProps {
    value: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    active: boolean;
    colorClass: string; 
}

// ============================================================================
// 1. CONFIGURAÇÃO DE INTELIGÊNCIA ARTIFICIAL (CORRIGIDO)
// ============================================================================
export function AIConfigForm({ settings }: { settings: Settings | null }) {
    const [provider, setProvider] = useState(settings?.aiProvider || "ollama");
    const [isLoading, setIsLoading] = useState(false);

    // ✅ SOLUÇÃO ELEGANTE: Função auxiliar para pegar a chave correta sem erros de TS
    const getCurrentApiKey = () => {
        if (!settings) return "";
        switch (provider) {
            case 'openai': return settings.openaiKey || "";
            case 'groq': return settings.groqKey || "";
            case 'google': return settings.googleKey || "";
            default: return "";
        }
    };

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
        <form action={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* SELETOR DE PROVEDOR */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-indigo-500" /> Motor de Processamento
                    </Label>
                    <span className="text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                        Selecionado: <span className="font-bold capitalize">{provider}</span>
                    </span>
                </div>
                
                <RadioGroup 
                    name="aiProvider" 
                    defaultValue={provider} 
                    onValueChange={setProvider}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <ProviderCard 
                        value="ollama" 
                        icon={<HardDrive className="h-6 w-6" />} 
                        title="Local (Ollama)" 
                        desc="Privacidade total. Grátis. Requer PC rápido."
                        active={provider === 'ollama'}
                        colorClass="border-zinc-500 text-zinc-600 dark:text-zinc-400 peer-data-[state=checked]:border-zinc-500 peer-data-[state=checked]:bg-zinc-50 dark:peer-data-[state=checked]:bg-zinc-900"
                    />
                    
                    <ProviderCard 
                        value="groq" 
                        icon={<Zap className="h-6 w-6" />} 
                        title="Groq Cloud" 
                        desc="Velocidade extrema. Grátis (Beta)."
                        active={provider === 'groq'}
                        colorClass="border-orange-500 text-orange-600 dark:text-orange-400 peer-data-[state=checked]:border-orange-500 peer-data-[state=checked]:bg-orange-50 dark:peer-data-[state=checked]:bg-orange-950/20"
                    />

                    <ProviderCard 
                        value="openai" 
                        icon={<Cloud className="h-6 w-6" />} 
                        title="OpenAI (GPT)" 
                        desc="O padrão da indústria. Pago por uso."
                        active={provider === 'openai'}
                        colorClass="border-emerald-500 text-emerald-600 dark:text-emerald-400 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 dark:peer-data-[state=checked]:bg-emerald-950/20"
                    />

                    <ProviderCard 
                        value="google" 
                        icon={<Sparkles className="h-6 w-6" />} 
                        title="Google Gemini" 
                        desc="Janela de contexto longa. Grátis/Pago."
                        active={provider === 'google'}
                        colorClass="border-blue-500 text-blue-600 dark:text-blue-400 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 dark:peer-data-[state=checked]:bg-blue-950/20"
                    />
                </RadioGroup>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-2">
                
                {/* 1. MODELO */}
                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Bot className="h-4 w-4 text-zinc-500" /> Modelo Técnico
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input 
                            id="aiModel"
                            name="aiModel" 
                            defaultValue={settings?.aiModel || "llama3"} 
                            placeholder={provider === 'ollama' ? "ex: llama3" : provider === 'openai' ? "ex: gpt-4-turbo" : "ex: llama-3.3-70b-versatile"} 
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono text-sm"
                        />
                        <p className="text-[11px] text-zinc-400 mt-2">
                            {provider === 'ollama' ? "Nome exato do modelo baixado (`ollama list`)." : "Nome do modelo na API do provedor."}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. API KEY (USANDO HELPER) */}
                <Card className={cn("border-zinc-200 dark:border-zinc-800 shadow-sm transition-opacity duration-300", provider === 'ollama' ? "opacity-50 grayscale" : "opacity-100")}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <KeyRound className="h-4 w-4 text-zinc-500" /> Credencial (API Key)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input 
                            name={`${provider}Key`} 
                            type="password" 
                            // ✅ USANDO A FUNÇÃO AUXILIAR AQUI (Correção do Erro)
                            defaultValue={getCurrentApiKey()} 
                            placeholder={provider === 'ollama' ? "Não necessário" : "sk-..."} 
                            disabled={provider === 'ollama'}
                            className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-mono text-sm"
                        />
                        <p className="text-[11px] text-zinc-400 mt-2">
                            {provider === 'ollama' ? "Localhost não precisa de chave." : "Sua chave é criptografada no banco local."}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 4. PERSONALIDADE */}
            <div className="space-y-3">
                <Label htmlFor="aiPersona" className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4 text-purple-500" /> Personalidade (System Prompt)
                </Label>
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <Textarea 
                        id="aiPersona"
                        name="aiPersona" 
                        defaultValue={settings?.aiPersona || ""} 
                        className="relative min-h-[120px] bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 leading-relaxed p-4 resize-y focus-visible:ring-0" 
                        placeholder="Ex: Você é um assistente focado em produtividade extrema. Responda de forma curta, direta e motivadora..."
                    />
                </div>
                <p className="text-xs text-zinc-500">Define como a IA deve se comportar e responder suas perguntas.</p>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 px-8">
                    {isLoading ? (
                        <span className="flex items-center gap-2">Salvando...</span>
                    ) : (
                        <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Salvar Alterações</span>
                    )}
                </Button>
            </div>
        </form>
    );
}

function ProviderCard({ value, icon, title, desc, active, colorClass }: ProviderCardProps) {
    return (
        <div>
            <RadioGroupItem value={value} id={value} className="peer sr-only" />
            <Label
                htmlFor={value}
                className={cn(
                    "flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 h-full text-center hover:scale-[1.02]",
                    active ? colorClass + " shadow-md" : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400"
                )}
            >
                <div className={cn("mb-3 transition-colors", active ? "text-current" : "text-zinc-300 dark:text-zinc-600")}>
                    {icon}
                </div>
                <div className="space-y-1">
                    <span className="font-semibold text-sm block">{title}</span>
                    <p className="text-[10px] opacity-80 leading-tight">{desc}</p>
                </div>
                {active && <CheckCircle2 className="w-4 h-4 mt-3 animate-in zoom-in" />}
            </Label>
        </div>
    )
}

// ============================================================================
// 2. ANALYTICS DE ARMAZENAMENTO
// ============================================================================
export function StorageAnalytics({ stats }: { stats: StorageStats }) {
    return (
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-950">
            <CardHeader className="pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Database className="h-4 w-4 text-indigo-500" /> Uso do Banco de Dados
                        </CardTitle>
                        <CardDescription>Visão geral dos registros no SQLite.</CardDescription>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalItems}</span>
                        <p className="text-xs text-zinc-500">Registros Totais</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium text-zinc-500 mb-1">
                        <span>Distribuição</span>
                        <span>100%</span>
                    </div>
                    <div className="h-6 w-full flex rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800/50">
                        {stats.breakdown.map((item, idx) => (
                            <div 
                                key={idx}
                                className={`h-full ${item.color} first:rounded-l-md last:rounded-r-md border-r border-white/20 dark:border-black/20 last:border-0 hover:opacity-90 transition-opacity cursor-help`}
                                style={{ width: `${Math.max(item.percent, 2)}%` }} 
                                title={`${item.label}: ${item.count} items`}
                            />
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {stats.breakdown.map((item) => (
                        <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                            </div>
                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-200">
                                {item.count}
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
            {stats.disk && (
                <CardFooter className="bg-zinc-50 dark:bg-zinc-900/30 border-t border-zinc-100 dark:border-zinc-800 py-3 px-6 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 text-zinc-500">
                        <Server className="h-3 w-3" />
                        <span>Armazenamento Físico ({stats.disk.path})</span>
                    </div>
                    <div className="font-mono">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{stats.disk.used}</span> usados de {stats.disk.total}
                    </div>
                </CardFooter>
            )}
        </Card>
    );
}

// ============================================================================
// 3. FORMULÁRIO DE SEGURANÇA
// ============================================================================
export function SecurityForm() {
    const handleSubmit = async (formData: FormData) => {
        await changePassword(formData);
        toast.success("Senha mestra alterada. Faça login novamente.");
    };

    return (
        <Card className="border-red-100 dark:border-red-900/20 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-red-500/80" /> 
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 text-base">
                    <ShieldCheck className="h-5 w-5 text-red-500" /> Segurança e Acesso
                </CardTitle>
                <CardDescription>Gerencie a senha mestra que protege todo o sistema.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-red-50 dark:bg-red-950/10 rounded-lg border border-red-100 dark:border-red-900/30 flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                        <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
                            <p className="font-bold">Atenção:</p>
                            <p>Alterar a senha desconectará todas as sessões ativas imediatamente. Certifique-se de memorizar a nova credencial.</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="newPassword">Nova Senha Mestra</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input 
                                id="newPassword" 
                                type="password" 
                                name="newPassword" 
                                required 
                                placeholder="••••••••" 
                                className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus-visible:ring-red-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button type="submit" variant="destructive" className="bg-red-600 hover:bg-red-700 shadow-sm">
                            Atualizar Credenciais
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// 4. CONFIGURAÇÃO DE ARMAZENAMENTO FÍSICO
// ============================================================================
export function StorageLocationForm({ currentPath }: { currentPath?: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [pathValue, setPathValue] = useState(currentPath || "D:/LifeOS_Data");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        // Garante envio do estado
        formData.set("storagePath", pathValue); 
        try {
            await updateStoragePath(formData);
            toast.success("Banco de dados movido com sucesso!", {
                description: "Reinicie a aplicação para garantir a integridade.",
                duration: 5000,
            });
        } catch (error) {
            toast.error("Caminho inválido ou sem permissão.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/10 dark:bg-indigo-950/5">
            <CardContent className="p-6">
                <form action={handleSubmit} className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl shadow-sm text-indigo-600 border border-indigo-100 dark:border-indigo-900/50">
                            <HardDrive className="h-6 w-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Localização do Banco de Dados</h4>
                            <p className="text-xs text-zinc-500 leading-relaxed max-w-md">
                                Você tem controle total. Escolha uma pasta no seu HD, SSD ou Pen Drive para armazenar o arquivo <code>life_os.db</code>.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-2 pt-2">
                        <Label htmlFor="storagePath" className="text-xs font-semibold uppercase text-zinc-400">Caminho Atual</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <FolderInput className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input 
                                    name="storagePath" 
                                    value={pathValue}
                                    onChange={(e) => setPathValue(e.target.value)}
                                    placeholder="Ex: D:/MeusArquivos/LifeOS" 
                                    className="pl-9 bg-white dark:bg-zinc-950 font-mono text-xs border-indigo-200 dark:border-indigo-800 focus-visible:ring-indigo-500"
                                />
                            </div>
                            
                            {/* Botão de abrir pastas */}
                            <FolderPicker 
                                currentPath={pathValue} 
                                onSelect={(newPath) => setPathValue(newPath)} 
                            />

                            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" disabled={isLoading}>
                                {isLoading ? "Movendo..." : "Mover"}
                            </Button>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

// Helper visual
function Separator() {
    return <div className="h-px w-full bg-zinc-100 dark:bg-zinc-800 my-6" />;
}