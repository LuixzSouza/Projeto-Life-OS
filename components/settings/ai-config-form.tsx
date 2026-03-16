"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateAISettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { 
    Cpu, Bot, Cloud, HardDrive, KeyRound, Save, 
    Zap, Sparkles, Loader2, CheckCircle2, Brain, 
    Wind, ExternalLink, Eye, EyeOff, RotateCcw
} from "lucide-react";
import { Settings } from "@prisma/client"; 
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AIConfigFormProps {
    settings: Settings | null;
}

const DEFAULT_PERSONA = "Você é o núcleo de inteligência (Cérebro Digital) do sistema Life OS. Responda de forma cirúrgica e prestativa.";

export function AIConfigForm({ settings }: AIConfigFormProps) {
    const [provider, setProvider] = useState(settings?.aiProvider || "ollama");
    const [isLoading, setIsLoading] = useState(false);
    const [showKey, setShowKey] = useState(false);
    const [personaText, setPersonaText] = useState(settings?.aiPersona || "");

    const getProviderLink = () => {
        switch (provider) {
            case 'openai': return "https://platform.openai.com/api-keys";
            case 'groq': return "https://console.groq.com/keys";
            case 'google': return "https://aistudio.google.com/app/apikey";
            case 'deepseek': return "https://platform.deepseek.com/api_keys";
            case 'mistral': return "https://console.mistral.ai/api-keys/";
            case 'ollama': return "https://ollama.com/";
            default: return "#";
        }
    };

    // 🟢 ELIMINANDO O ANY USANDO UNKNOWN + CAST ESTRITO
    const getCurrentApiKey = (): string => {
        if (!settings) return "";
        const s = settings as unknown as Record<string, string | null | undefined>;
        return s[`${provider}Key`] || "";
    };

    const isLocal = provider === 'ollama';
    const isDefaultPersona = personaText.trim() === "" || personaText === DEFAULT_PERSONA;

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await updateAISettings(formData);
            toast.success("Núcleo neural atualizado com sucesso!");
        } catch (error) {
            toast.error("Falha ao salvar parâmetros do sistema.");
        } finally {
            setIsLoading(false);
        }
    };

    const restoreDefaultPersona = () => {
        setPersonaText(""); 
    };

    return (
        <form action={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            
            {/* --- SELETOR DE PROVEDOR --- */}
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" /> Motor de Processamento
                    </Label>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted/50 px-3 py-1 rounded-full border border-border/40">
                        Ativo: <span className={cn("text-foreground", provider === 'ollama' ? "text-zinc-500" : "text-primary")}>{provider}</span>
                    </span>
                </div>
                
                <RadioGroup 
                    name="aiProvider" 
                    value={provider} 
                    onValueChange={(val) => {
                        setProvider(val);
                        setShowKey(false); 
                    }}
                    className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3"
                >
                    <ProviderCard value="ollama" icon={<HardDrive className="h-5 w-5" />} title="Local" active={provider === 'ollama'} colorClass="text-zinc-500" />
                    <ProviderCard value="groq" icon={<Zap className="h-5 w-5" />} title="Groq" active={provider === 'groq'} colorClass="text-orange-500" />
                    <ProviderCard value="openai" icon={<Cloud className="h-5 w-5" />} title="OpenAI" active={provider === 'openai'} colorClass="text-emerald-500" />
                    <ProviderCard value="google" icon={<Sparkles className="h-5 w-5" />} title="Gemini" active={provider === 'google'} colorClass="text-blue-500" />
                    <ProviderCard value="deepseek" icon={<Brain className="h-5 w-5" />} title="DeepSeek" active={provider === 'deepseek'} colorClass="text-indigo-500" />
                    <ProviderCard value="mistral" icon={<Wind className="h-5 w-5" />} title="Mistral" active={provider === 'mistral'} colorClass="text-yellow-500" />
                </RadioGroup>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* --- INPUT: MODELO --- */}
                <div className="space-y-3 bg-muted/10 p-5 rounded-[2rem] border border-border/40 relative">
                    <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <Bot className="h-4 w-4" /> Versão do Modelo
                        </Label>
                        <Badge label="REQUERIDO" />
                    </div>
                    <Input 
                        id="aiModel" 
                        name="aiModel" 
                        defaultValue={settings?.aiModel || "llama3"} 
                        placeholder={isLocal ? "ex: llama3, mistral" : "ex: gpt-4-turbo"} 
                        className="bg-background border-border/40 font-mono text-sm focus-visible:ring-primary rounded-xl h-12" 
                        required
                    />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        Insira o nome exato da versão do modelo que deseja utilizar.
                    </p>
                </div>

                {/* --- INPUT: API KEY (DINÂMICO) --- */}
                <div className={cn("space-y-3 p-5 rounded-[2rem] border transition-all duration-500 relative", isLocal ? "bg-muted/5 border-border/20 opacity-60 grayscale" : "bg-primary/5 border-primary/20 shadow-inner")}>
                    <div className="flex justify-between items-center">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <KeyRound className="h-4 w-4" /> Credencial de Acesso
                        </Label>
                        {!isLocal && (
                            <Link href={getProviderLink()} target="_blank" className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors">
                                Obter Chave <ExternalLink className="h-3 w-3" />
                            </Link>
                        )}
                    </div>
                    
                    <div className="relative group/input">
                        <Input 
                            key={provider} 
                            name={`${provider}Key`} 
                            type={showKey ? "text" : "password"} 
                            defaultValue={getCurrentApiKey()} 
                            placeholder={isLocal ? "Modo Offline: Chave não necessária" : "sk-..."} 
                            disabled={isLocal} 
                            className={cn("bg-background font-mono text-sm rounded-xl h-12 pr-12", isLocal ? "border-transparent" : "border-primary/30 focus-visible:ring-primary")} 
                        />
                        {!isLocal && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setShowKey(!showKey)} 
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 rounded-lg hover:bg-muted/50"
                            >
                                {showKey ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                            </Button>
                        )}
                    </div>
                    
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        {isLocal ? "Ollama roda localmente na porta 11434." : `Sua chave ${provider.toUpperCase()} é criptografada e salva localmente.`}
                    </p>
                </div>
            </div>

            {/* --- INPUT: PERSONALIDADE --- */}
            <div className="space-y-3 bg-muted/10 p-5 rounded-[2rem] border border-border/40">
                <div className="flex items-center justify-between">
                    <Label htmlFor="aiPersona" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <Sparkles className="h-4 w-4 text-primary" /> Personalidade Base (System Prompt)
                    </Label>
                    {/* Feedback Dinâmico sobre o estado da Personalidade */}
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border",
                            isDefaultPersona ? "bg-muted/50 text-muted-foreground border-border/40" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                            {isDefaultPersona ? "Padrão do Sistema" : "Personalizado"}
                        </span>
                        {!isDefaultPersona && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="sm" 
                                onClick={restoreDefaultPersona}
                                className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                            >
                                <RotateCcw className="h-3 w-3 mr-1" /> Resetar
                            </Button>
                        )}
                    </div>
                </div>

                <div className="relative group mt-2">
                    <div className="absolute -inset-0.5 bg-primary/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-md" />
                    <Textarea 
                        id="aiPersona" 
                        name="aiPersona" 
                        value={personaText}
                        onChange={(e) => setPersonaText(e.target.value)}
                        className="relative min-h-[120px] bg-background border-border/40 leading-relaxed p-4 rounded-xl resize-y focus-visible:ring-primary font-medium" 
                        placeholder={DEFAULT_PERSONA} 
                    />
                </div>
                <p className="text-[9px] font-medium text-muted-foreground/60 leading-relaxed max-w-3xl">
                    Se este campo ficar vazio, a IA assumirá automaticamente a identidade de Cérebro Digital do Life OS. Descreva como deseja que ela aja, fale ou responda às suas solicitações.
                </p>
            </div>

            {/* --- BOTÃO SALVAR --- */}
            <div className="flex justify-end pt-2">
                <Button 
                    type="submit" 
                    disabled={isLoading} 
                    className="bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[10px] rounded-full h-12 px-8 shadow-xl transition-transform hover:scale-105"
                >
                    {isLoading ? (
                        <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Atualizando Núcleo...</span>
                    ) : (
                        <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Sincronizar Cérebro</span>
                    )}
                </Button>
            </div>
        </form>
    );
}

/* --- COMPONENTES AUXILIARES --- */
interface ProviderCardProps {
    value: string;
    icon: React.ReactNode;
    title: string;
    active: boolean;
    colorClass: string;
}

function ProviderCard({ value, icon, title, active, colorClass }: ProviderCardProps) {
    return (
        <div className="relative h-full">
            <RadioGroupItem value={value} id={`provider-${value}`} className="peer sr-only" />
            <Label 
                htmlFor={`provider-${value}`} 
                className={cn(
                    "flex flex-col items-center justify-center rounded-[1.5rem] border-2 p-4 cursor-pointer transition-all duration-300 h-full text-center group bg-background/50 backdrop-blur-sm", 
                    active ? "border-primary shadow-lg shadow-primary/5 bg-primary/5 scale-[1.02]" : "border-border/40 hover:bg-muted/50 hover:border-primary/30"
                )}
            >
                <div className={cn("mb-2 transition-colors", active ? colorClass : "text-muted-foreground")}>
                    {icon}
                </div>
                <span className={cn("font-black uppercase tracking-widest text-[9px] block", active ? "text-foreground" : "text-muted-foreground")}>
                    {title}
                </span>
                
                <div className="absolute top-2 right-2">
                   {active && <CheckCircle2 className={cn("w-3.5 h-3.5 animate-in zoom-in", colorClass)} />}
                </div>
            </Label>
        </div>
    )
}

function Badge({ label }: { label: string }) {
    return (
        <span className="text-[8px] font-black tracking-widest px-2 py-0.5 rounded-sm border border-border/40 bg-muted/50 text-muted-foreground/80">
            {label}
        </span>
    );
}