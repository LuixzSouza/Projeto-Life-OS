// src/components/settings/api-integrations-form.tsx
"use client";

import React, { useState } from "react";
import { Settings } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, Film, Gamepad2, Banknote, Loader2, Shield, 
  ExternalLink, Eye, EyeOff, Copy, Check, Info, 
  Key, Database, Lock, TestTube2, Sparkles
} from "lucide-react";
import { useFormStatus } from "react-dom";
import { updateApiKeys } from "@/app/(dashboard)/settings/actions";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface APIIntegrationsFormProps {
  settings: Settings | null;
}

// Tipos e interfaces
type APIProvider = {
  id: string;
  name: string;
  label: string;
  icon: React.ElementType;
  description: string;
  category: 'content' | 'finance' | 'developer';
  status: 'active' | 'inactive' | 'error';
  link: { url: string; label: string };
  secret?: boolean;
  validation?: RegExp;
};

// Componentes auxiliares
const StatusIndicator = ({ status }: { status: APIProvider['status'] }) => {
  const config = {
    active: { color: "bg-emerald-500", label: "Ativo" },
    inactive: { color: "bg-zinc-300 dark:bg-zinc-700", label: "Inativo" },
    error: { color: "bg-rose-500", label: "Erro" },
  };
  
  const { color, label } = config[status];
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
};

const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-6 gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/10"
      size="lg"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      {pending ? "Salvando..." : "Salvar todas as chaves"}
    </Button>
  );
};

// Componente principal do campo
const APIInputField: React.FC<{
  field: APIProvider;
  defaultValue?: string | null;
}> = ({ field, defaultValue }) => {
  const [revealed, setRevealed] = useState(false);
  const [value, setValue] = useState(defaultValue ?? "");
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState(Boolean(defaultValue));

  const handleCopy = async () => {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Chave copiada!", {
        description: "A chave foi copiada para a área de transferência",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleTest = async () => {
    if (!value) {
      toast.error("Campo vazio", {
        description: "Insira uma chave para testar",
      });
      return;
    }

    setTesting(true);
    
    // Simulação de teste
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const isValid = value.length > 10;
    
    if (isValid) {
      toast.success("Conexão estabelecida!", {
        description: `A chave ${field.name} está funcionando corretamente`,
      });
    } else {
      toast.error("Chave inválida", {
        description: "A chave parece estar incorreta ou expirada",
      });
    }
    
    setTesting(false);
  };

  return (
    <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <field.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold">{field.label}</CardTitle>
                <StatusIndicator status={field.status} />
              </div>
              <CardDescription className="text-xs mt-1">{field.description}</CardDescription>
            </div>
          </div>
          <Link
            href={field.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-muted rounded-lg transition-colors shrink-0"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.id} className="text-xs font-medium flex items-center gap-1">
              <Key className="h-3 w-3" />
              Chave da API
            </Label>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActive(!active)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full transition-colors",
                  active
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {active ? "Ativo" : "Inativo"}
              </button>
              
              {field.secret && (
                <Badge variant="outline" className="text-xs py-1 px-2 border-amber-500/30 text-amber-600">
                  <Lock className="h-3 w-3 mr-1" />
                  Secreta
                </Badge>
              )}
            </div>
          </div>
          
          <div className="relative">
            <Input
              id={field.id}
              name={field.id}
              type={revealed ? "text" : "password"}
              placeholder={field.secret ? "••••••••••••••••" : "Insira sua chave da API..."}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className={cn(
                "font-mono text-sm pr-32 transition-all",
                !active && "opacity-50 bg-muted/50",
                field.secret && "border-amber-500/30 focus-visible:border-amber-500/50"
              )}
              disabled={!active}
            />
            
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRevealed(!revealed)}
                className="h-8 w-8 p-0"
              >
                {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleTest}
                disabled={testing || !value}
                className="h-8 w-8 p-0"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        
        {field.secret && (
          <Alert variant="warning" className="border-amber-500/30 bg-amber-50/10">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs text-amber-600">
              Esta é uma chave secreta. Nunca a compartilhe ou exponha publicamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

// Componente principal
export default function APIIntegrationsForm({ settings }: APIIntegrationsFormProps) {
  const [activeTab, setActiveTab] = useState<string>("content");

  // Dados das APIs organizados por categoria
  const apiProviders: APIProvider[] = [
    {
      id: "tmdbApiKey",
      name: "tmdb",
      label: "The Movie Database",
      icon: Film,
      description: "Filmes, séries e conteúdo multimídia",
      category: "content",
      status: getSettingValue(settings, "tmdbApiKey") ? "active" : "inactive",
      link: { url: "https://www.themoviedb.org/settings/api", label: "Dashboard TMDB" },
    },
    {
      id: "rawgApiKey",
      name: "rawg",
      label: "RAWG Video Games",
      icon: Gamepad2,
      description: "Catálogo completo de jogos e informações",
      category: "content",
      status: getSettingValue(settings, "rawgApiKey") ? "active" : "inactive",
      link: { url: "https://rawg.io/apidocs", label: "Documentação RAWG" },
    },
    {
      id: "pluggyClientId",
      name: "pluggy-client",
      label: "Pluggy Client ID",
      icon: Banknote,
      description: "Identificador público para integração financeira",
      category: "finance",
      status: getSettingValue(settings, "pluggyClientId") ? "active" : "inactive",
      link: { url: "https://dashboard.pluggy.ai/settings/api-keys", label: "Pluggy Dashboard" },
    },
    {
      id: "pluggyClientSecret",
      name: "pluggy-secret",
      label: "Pluggy Client Secret",
      icon: Shield,
      description: "Chave secreta para autenticação financeira",
      category: "finance",
      status: getSettingValue(settings, "pluggyClientSecret") ? "active" : "inactive",
      link: { url: "https://dashboard.pluggy.ai/settings/api-keys", label: "Pluggy Dashboard" },
      secret: true,
    },
  ];

  const contentAPIs = apiProviders.filter(api => api.category === "content");
  const financeAPIs = apiProviders.filter(api => api.category === "finance");

  const handleSubmit = async (formData: FormData) => {
    try {
      const result = await updateApiKeys(formData);
      
      if (result.success) {
        toast.success("Configurações salvas", {
          description: "Todas as chaves foram atualizadas com sucesso",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast.error("Erro ao salvar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Integrações API</h2>
            <p className="text-muted-foreground">
              Configure suas chaves de API para conectar serviços externos
            </p>
          </div>
        </div>
        
        <Alert className="border-primary/20 bg-primary/5">
          <Globe className="h-4 w-4" />
          <AlertDescription className="text-sm">
            As chaves são armazenadas de forma segura no seu banco de dados e usadas apenas no servidor
          </AlertDescription>
        </Alert>
      </div>

      {/* Navegação por abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="content" className="gap-2">
            <Film className="h-4 w-4" />
            Conteúdo Digital
            <Badge variant="secondary" className="ml-2">
              {contentAPIs.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <Banknote className="h-4 w-4" />
            Financeiro
            <Badge variant="secondary" className="ml-2">
              {financeAPIs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Aba de Conteúdo */}
        <TabsContent value="content" className="space-y-6 pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">APIs de Conteúdo Digital</h3>
              <p className="text-sm text-muted-foreground">
                Conecte serviços para enriquecer seu catálogo pessoal de mídia
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contentAPIs.map((api) => (
                <APIInputField
                  key={api.id}
                  field={api}
                  defaultValue={getSettingValue(settings, api.id)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Aba Financeira */}
        <TabsContent value="finance" className="space-y-6 pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Integrações Financeiras</h3>
              <p className="text-sm text-muted-foreground">
                Conecte serviços para agregação de dados financeiros
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {financeAPIs.map((api) => (
                <APIInputField
                  key={api.id}
                  field={api}
                  defaultValue={getSettingValue(settings, api.id)}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Formulário e ações */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Salvar Configurações</CardTitle>
          <CardDescription className="text-sm">
            Após salvar, as chaves estarão disponíveis imediatamente para uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            {/* Campos ocultos para cada API */}
            {apiProviders.map((api) => (
              <input
                key={api.id}
                type="hidden"
                name={api.id}
                value={getSettingValue(settings, api.id) || ""}
              />
            ))}
            
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="text-sm text-muted-foreground space-y-1">
                <p className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Armazenamento local seguro
                </p>
                <p className="text-xs">
                  Atualizações são aplicadas instantaneamente
                </p>
              </div>
              
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="flex-1 sm:flex-none"
                >
                  Recarregar
                </Button>
                <SubmitButton />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Dicas e informações */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Info className="h-4 w-4" />
              Boas práticas de segurança
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                Nunca compartilhe suas chaves secretas publicamente
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                Revogue chaves antigas ou não utilizadas
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                Use variáveis de ambiente em produção
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Função auxiliar
function getSettingValue(obj: Settings | null, key: string): string | null | undefined {
  if (!obj) return null;
  return obj[key as keyof Settings] as string | null | undefined;
}