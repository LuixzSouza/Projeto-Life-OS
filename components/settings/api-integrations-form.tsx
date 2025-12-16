// src/components/settings/api-integrations-form.tsx
"use client";

import React, { useState } from "react";
import { Settings } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, Film, Gamepad2, Banknote, Loader2, Shield, ArrowUpRight, Eye, EyeOff, Copy, Check, Info } from "lucide-react";
import { useFormStatus } from "react-dom";
import { updateApiKeys } from "@/app/(dashboard)/settings/actions";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface APIIntegrationsFormProps {
    settings: Settings | null;
}

// ============================================================================
// UTILS
// ============================================================================
function getSettingValue(obj: Settings | null, key: string): string | null | undefined {
    if (!obj) return null;
    return obj[key as keyof Settings] as string | null | undefined;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SubmitButton: React.FC = () => {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto px-6 h-10 gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
        >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            {pending ? "Salvando..." : "Salvar Configurações"}
        </Button>
    );
};

type APIField = {
    name: string;
    label: string;
    icon: React.ElementType;
    description: string;
    link: { url: string; label: string };
    secret?: boolean;
};

const fieldList: APIField[] = [
    {
        name: "tmdbApiKey",
        label: "The Movie Database (TMDB) API Key",
        icon: Film,
        description: "Busca informações detalhadas de filmes, séries e trailers.",
        link: { url: "https://www.themoviedb.org/settings/api", label: "Gerar Chave TMDB" },
    },
    {
        name: "rawgApiKey",
        label: "RAWG (Jogos) API Key",
        icon: Gamepad2,
        description: "Busca dados de jogos, capas e lançamentos para seu catálogo pessoal.",
        link: { url: "https://rawg.io/apidocs", label: "Gerar Chave RAWG" },
    },
    {
        name: "pluggyClientId",
        label: "Pluggy Client ID",
        icon: Banknote,
        description: "Identificador público necessário para conectar e agregar contas bancárias.",
        link: { url: "https://dashboard.pluggy.ai/settings/api-keys", label: "Acessar Pluggy Dashboard" },
    },
    {
        name: "pluggyClientSecret",
        label: "Pluggy Client Secret",
        icon: Shield,
        description: "Chave privada e confidencial para Pluggy. Mantenha esta chave confidencial.",
        link: { url: "https://dashboard.pluggy.ai/settings/api-keys", label: "Acessar Pluggy Dashboard" },
        secret: true,
    },
];

const APIInputField: React.FC<{
    field: APIField;
    defaultValue?: string | null;
}> = ({ field, defaultValue }) => {
    const [revealed, setRevealed] = useState(false);
    const [value, setValue] = useState(defaultValue ?? "");
    const [testing, setTesting] = useState(false);
    const [enabled, setEnabled] = useState(Boolean(defaultValue)); // Estado para saber se o campo está em uso

    const isSecret = field.secret ?? false;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(value ?? "");
            toast.success("Chave copiada para a área de transferência");
        } catch (err) {
            toast.error("Não foi possível copiar");
        }
    };

    const handleTest = async () => {
        setTesting(true);
        try {
            // Implementação simulada da chamada de teste
            const res = await fetch("/api/settings/test-key", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: field.name, value }),
            });
            const json = await res.json();
            if (json?.success) {
                toast.success(json.message ?? "Conexão OK!");
            } else {
                toast.error(json?.message ?? "Falha: Chave pode estar inválida.");
            }
        } catch (err) {
            toast.error("Erro na requisição de teste");
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="space-y-3 group">
            <div className="flex items-start justify-between">
                
                {/* Rótulo Principal e Descrição */}
                <Label htmlFor={field.name} className="flex flex-col items-start text-sm font-medium text-foreground">
                    <span className="flex items-center gap-2">
                        <field.icon className="h-4 w-4 text-primary" /> {field.label}
                    </span>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">{field.description}</p>
                </Label>

                {/* Ações Secundárias (Link e Toggle) */}
                <div className="flex flex-col items-end gap-2">
                    <Link href={field.link.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline transition-colors flex items-center gap-1 opacity-80">
                        {field.link.label} <ArrowUpRight className="h-3 w-3" />
                    </Link>
                    
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" className="rounded border accent-primary" checked={enabled} onChange={() => setEnabled((s) => !s)} />
                        Ativar/Atualizar
                    </label>
                </div>
            </div>

            <div className="relative">
                <Input
                    id={field.name}
                    name={field.name}
                    type={revealed ? "text" : "password"}
                    placeholder={isSecret ? "******** (Chave Secreta)" : "Insira sua chave API pública..."}
                    value={value} 
                    onChange={(e) => setValue(e.target.value)}
                    className={cn(
                        "font-mono h-11 w-full pl-3 pr-[130px] border-border/60 transition-all duration-200 focus-visible:border-primary/60",
                        !enabled && "opacity-60 bg-muted/40"
                    )}
                    aria-label={`Campo de API: ${field.label}`}
                    disabled={!enabled}
                />

                {/* BOTÕES DE AÇÃO INTEGRADOS E DISCRETOS */}
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center divide-x divide-border">
                    <TooltipProvider>
                        {/* Revelar */}
                        <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                                <button type="button" className="p-2 text-muted-foreground hover:text-primary transition-colors" onClick={() => setRevealed((r) => !r)} aria-pressed={revealed} disabled={!enabled}>
                                    {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">{revealed ? "Ocultar" : "Revelar Chave"}</TooltipContent>
                        </Tooltip>

                        {/* Copiar */}
                        <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                                <button type="button" className="p-2 text-muted-foreground hover:text-primary transition-colors" onClick={handleCopy} disabled={!value || !enabled}>
                                    <Copy className="h-4 w-4" />
                                </button>
                            </TooltipTrigger>
                             <TooltipContent className="text-xs">Copiar Chave</TooltipContent>
                        </Tooltip>

                        {/* Testar */}
                        <Tooltip delayDuration={200}>
                            <TooltipTrigger asChild>
                                <button type="button" className="p-2 text-muted-foreground hover:text-green-500 transition-colors" onClick={handleTest} disabled={!value || testing || !enabled}>
                                    {testing ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Check className="h-4 w-4" />}
                                </button>
                            </TooltipTrigger>
                             <TooltipContent className="text-xs">{testing ? "Testando..." : "Testar Conexão"}</TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            {isSecret && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-50/10 p-3 text-sm text-amber-600 flex items-start gap-3">
                    <Info className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="leading-relaxed"><strong>Aviso de Segurança:</strong> Esta é uma chave privada (**secret**). Ela só será usada no servidor. Mantenha em segredo absoluto.</p>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function APIIntegrationsForm({ settings }: APIIntegrationsFormProps) {
    
    const handleSubmit = async (formData: FormData) => {
        const result = await updateApiKeys(formData);

        if (result.success) {
            toast.success(result.message ?? "Configurações salvas com sucesso");
        } else {
            toast.error(`Erro ao salvar: ${result.message ?? "Falha desconhecida no servidor."}`);
        }
    };

    return (
        <TooltipProvider>
            <form action={handleSubmit} className="space-y-10">
                
                <section className="space-y-6">
                    <h4 className="text-lg font-semibold border-b border-dashed border-border/60 pb-3 text-foreground">Conteúdo Digital</h4>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        {fieldList.slice(0, 2).map((f) => (
                            <APIInputField 
                                key={f.name} 
                                field={f} 
                                defaultValue={getSettingValue(settings, f.name)} 
                            />
                        ))}
                    </div>
                </section>

                <section className="space-y-6">
                    <h4 className="text-lg font-semibold border-b border-dashed border-border/60 pb-3 text-foreground">Agregação Financeira</h4>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                        {fieldList.slice(2).map((f) => (
                            <APIInputField 
                                key={f.name} 
                                field={f} 
                                defaultValue={getSettingValue(settings, f.name)} 
                            />
                        ))}
                    </div>
                </section>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-end border-t border-border/60">
                    <Button type="button" variant="outline" onClick={() => window.location.reload()} className="hover:border-primary/50">Recarregar Página</Button>
                    <SubmitButton />
                </div>

                <div className="text-xs text-muted-foreground">
                    As chaves são armazenadas no seu banco de dados local. Use o botão &quot;Recarregar&quot; após salvar as chaves para que o backend comece a usá-las imediatamente.
                </div>
            </form>
        </TooltipProvider>
    );
}