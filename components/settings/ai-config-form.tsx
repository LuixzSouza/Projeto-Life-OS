"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateAISettings } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { Cpu, Bot, Cloud, HardDrive, KeyRound, Save, Zap, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { Settings } from "@prisma/client"; 
import { cn } from "@/lib/utils";

interface ProviderCardProps {
    value: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    active: boolean;
}

export function AIConfigForm({ settings }: { settings: Settings | null }) {
    const [provider, setProvider] = useState(settings?.aiProvider || "ollama");
    const [isLoading, setIsLoading] = useState(false);

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
                    <Label className="text-base font-semibold text-foreground flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-primary" /> Motor de Processamento
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full border border-border">
                        Selecionado: <span className="font-bold capitalize text-foreground">{provider}</span>
                    </span>
                </div>
                
                <RadioGroup 
                    name="aiProvider" 
                    defaultValue={provider} 
                    onValueChange={setProvider}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    <ProviderCard value="ollama" icon={<HardDrive className="h-6 w-6" />} title="Local (Ollama)" desc="Privacidade total. Grátis. Requer PC rápido." active={provider === 'ollama'} />
                    <ProviderCard value="groq" icon={<Zap className="h-6 w-6" />} title="Groq Cloud" desc="Velocidade extrema. Grátis (Beta)." active={provider === 'groq'} />
                    <ProviderCard value="openai" icon={<Cloud className="h-6 w-6" />} title="OpenAI (GPT)" desc="O padrão da indústria. Pago por uso." active={provider === 'openai'} />
                    <ProviderCard value="google" icon={<Sparkles className="h-6 w-6" />} title="Google Gemini" desc="Janela de contexto longa. Grátis/Pago." active={provider === 'google'} />
                </RadioGroup>
            </div>

            <div className="h-px w-full bg-border my-6" />

            <div className="grid gap-6 md:grid-cols-2">
                {/* MODELO */}
                <Card className="border-border shadow-sm bg-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                            <Bot className="h-4 w-4 text-muted-foreground" /> Modelo Técnico
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input id="aiModel" name="aiModel" defaultValue={settings?.aiModel || "llama3"} placeholder={provider === 'ollama' ? "ex: llama3" : "ex: gpt-4-turbo"} className="bg-muted/50 border-border font-mono text-sm focus-visible:ring-primary" />
                        <p className="text-[11px] text-muted-foreground mt-2">Nome do modelo na API ou Local.</p>
                    </CardContent>
                </Card>

                {/* API KEY */}
                <Card className={cn("border-border shadow-sm bg-card transition-opacity duration-300", provider === 'ollama' ? "opacity-50 grayscale" : "opacity-100")}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                            <KeyRound className="h-4 w-4 text-muted-foreground" /> Credencial (API Key)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input name={`${provider}Key`} type="password" defaultValue={getCurrentApiKey()} placeholder={provider === 'ollama' ? "Não necessário" : "sk-..."} disabled={provider === 'ollama'} className="bg-muted/50 border-border font-mono text-sm focus-visible:ring-primary" />
                    </CardContent>
                </Card>
            </div>

            {/* PERSONALIDADE */}
            <div className="space-y-3">
                <Label htmlFor="aiPersona" className="flex items-center gap-2 font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Personalidade (System Prompt)
                </Label>
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-primary/20 rounded-lg opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <Textarea id="aiPersona" name="aiPersona" defaultValue={settings?.aiPersona || ""} className="relative min-h-[120px] bg-background border-border leading-relaxed p-4 resize-y focus-visible:ring-primary" placeholder="Ex: Você é um assistente focado..." />
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-lg px-8 transition-transform hover:scale-[1.02]">
                    {isLoading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/> Salvando...</span> : <span className="flex items-center gap-2"><Save className="h-4 w-4" /> Salvar Alterações</span>}
                </Button>
            </div>
        </form>
    );
}

function ProviderCard({ value, icon, title, desc, active }: ProviderCardProps) {
    return (
        <div>
            <RadioGroupItem value={value} id={value} className="peer sr-only" />
            <Label htmlFor={value} className={cn("flex flex-col items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all duration-200 h-full text-center hover:scale-[1.02]", active ? "border-primary bg-primary/5 text-primary shadow-md" : "border-border bg-card hover:bg-muted text-muted-foreground")}>
                <div className={cn("mb-3 transition-colors", active ? "text-primary" : "text-muted-foreground")}>{icon}</div>
                <div className="space-y-1">
                    <span className={cn("font-semibold text-sm block", active ? "text-foreground" : "text-muted-foreground")}>{title}</span>
                    <p className="text-[10px] opacity-80 leading-tight">{desc}</p>
                </div>
                {active && <CheckCircle2 className="w-4 h-4 mt-3 animate-in zoom-in text-primary" />}
            </Label>
        </div>
    )
}