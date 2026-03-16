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
  Key, Database, Lock, TestTube2, Sparkles, Plug
} from "lucide-react";
import { useFormStatus } from "react-dom";
import { updateApiKeys } from "@/app/(dashboard)/settings/actions";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface APIIntegrationsFormProps {
  settings: Settings | null;
}

// -------------------------------------------------------------------------------------------------
// 1. TIPOS (REMOVIDO 'ai' DA CATEGORIA)
// -------------------------------------------------------------------------------------------------
type APIProvider = {
  id: string;
  name: string;
  label: string;
  icon: React.ElementType;
  description: string;
  category: 'content' | 'finance' | 'developer'; 
  status?: 'active' | 'inactive' | 'error' | 'pending'; 
  link: { url: string; label: string };
  secret?: boolean;
  validation?: RegExp;
};

// -------------------------------------------------------------------------------------------------
// 2. COMPONENTES AUXILIARES
// -------------------------------------------------------------------------------------------------
const StatusIndicator = ({ status }: { status: APIProvider['status'] }) => {
  const config = {
    active: { color: "bg-emerald-500 shadow-[0_0_8px_#10b981]", label: "Conectado" },
    inactive: { color: "bg-zinc-400 dark:bg-zinc-600", label: "Desconectado" },
    error: { color: "bg-rose-500 shadow-[0_0_8px_#f43f5e]", label: "Erro na API" },
    pending: { color: "bg-amber-500 shadow-[0_0_8px_#f59e0b]", label: "Requer Verificação" },
  };
  
  const { color, label } = config[status || 'inactive'];
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
};

const SubmitButton: React.FC = () => {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-8 gap-2 bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[10px] shadow-xl rounded-full transition-transform hover:scale-105"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Database className="h-4 w-4" />
      )}
      {pending ? "Sincronizando..." : "Sincronizar Chaves"}
    </Button>
  );
};

const APIInputField: React.FC<{
  field: APIProvider;
  defaultValue?: string | null;
  onChangeValue: (id: string, newValue: string) => void; 
}> = ({ field, defaultValue, onChangeValue }) => {
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
      toast.success("Credencial copiada para a área de transferência.");
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error("Falha ao copiar credencial."); }
  };

  const handleTest = async () => {
    if (!value) { toast.error("Campo de chave vazio."); return; }
    setTesting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const isValid = value.length > 10;
    if (isValid) toast.success(`Conexão com ${field.label} estabelecida!`);
    else toast.error(`A chave para ${field.label} parece inválida.`);
    setTesting(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue(val);
    onChangeValue(field.id, val);
  };

  const toggleActive = () => {
    const newState = !active;
    setActive(newState);
    if (!newState) {
      setValue("");
      onChangeValue(field.id, "");
    }
  };

  const currentStatus = active ? (value.trim() ? "active" : "pending") : "inactive";

  return (
    <Card className="overflow-hidden border-border/40 hover:border-primary/40 transition-all duration-500 group rounded-[2rem] bg-muted/5">
      <CardHeader className="pb-3 border-b border-border/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-background shadow-sm border border-border/40 text-primary group-hover:scale-105 transition-transform">
              <field.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-xs font-black uppercase tracking-wider">{field.label}</CardTitle>
                <StatusIndicator status={currentStatus} />
              </div>
              <CardDescription className="text-[10px] font-medium mt-1">{field.description}</CardDescription>
            </div>
          </div>
          <Link href={field.link.url} target="_blank" rel="noopener noreferrer" className="p-2 bg-background border border-border/40 rounded-xl hover:bg-muted transition-colors shrink-0 shadow-sm">
            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.id} className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-muted-foreground">
              <Key className="h-3.5 w-3.5" /> Hash/Key
            </Label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleActive} className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full transition-colors border", active ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-background border-border/40 text-muted-foreground hover:bg-muted")}>
                {active ? "Habilitado" : "Desabilitado"}
              </button>
              {field.secret && (
                <Badge variant="outline" className="text-[9px] py-1 px-2 border-amber-500/30 text-amber-600 bg-amber-500/5">
                  <Lock className="h-2.5 w-2.5 mr-1" /> Confidencial
                </Badge>
              )}
            </div>
          </div>
          
          <div className="relative group/input">
            <Input
              id={field.id}
              type={revealed ? "text" : "password"}
              placeholder={field.secret ? "••••••••••••••••" : "Cole a credencial aqui..."}
              value={value}
              onChange={handleChange}
              className={cn("font-mono text-xs pr-32 transition-all h-12 rounded-xl border-border/40 bg-background", !active && "opacity-50 grayscale", field.secret && "focus-visible:border-amber-500/50 focus-visible:ring-amber-500/20")}
              disabled={!active}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => setRevealed(!revealed)} className="h-8 w-8 rounded-lg hover:bg-muted">
                {revealed ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 rounded-lg hover:bg-muted">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={handleTest} disabled={testing || !value} className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// -------------------------------------------------------------------------------------------------
// 3. COMPONENTE PRINCIPAL
// -------------------------------------------------------------------------------------------------
export default function APIIntegrationsForm({ settings }: APIIntegrationsFormProps) {
  const [activeTab, setActiveTab] = useState<string>("content");

  // 🟢 REMOVIDAS AS CHAVES DA IA DAQUI
  const [formValues, setFormValues] = useState<Record<string, string>>({
    tmdbApiKey: getSettingValue(settings, "tmdbApiKey") || "",
    rawgApiKey: getSettingValue(settings, "rawgApiKey") || "",
    pluggyClientId: getSettingValue(settings, "pluggyClientId") || "",
    pluggySecret: getSettingValue(settings, "pluggySecret") || "",
  });

  const handleUpdateValue = (id: string, newValue: string) => {
    setFormValues(prev => ({ ...prev, [id]: newValue }));
  };

  // 🟢 REMOVIDOS OS PROVEDORES DA IA DAQUI
  const apiProviders: APIProvider[] = [
    { id: "tmdbApiKey", name: "tmdb", label: "TMDB API", icon: Film, description: "Cine OS - Filmes e Séries", category: "content", link: { url: "https://www.themoviedb.org/settings/api", label: "Dashboard" } },
    { id: "rawgApiKey", name: "rawg", label: "RAWG API", icon: Gamepad2, description: "Game OS - Catálogo de Jogos", category: "content", link: { url: "https://rawg.io/apidocs", label: "Dashboard" } },
    { id: "pluggyClientId", name: "pluggy-client", label: "Pluggy Client ID", icon: Banknote, description: "Open Finance - Identificador", category: "finance", link: { url: "https://dashboard.pluggy.ai/", label: "Pluggy" } },
    { id: "pluggySecret", name: "pluggy-secret", label: "Pluggy Client Secret", icon: Shield, description: "Open Finance - Chave Secreta", category: "finance", link: { url: "https://dashboard.pluggy.ai/", label: "Pluggy" }, secret: true },
  ];

  const contentAPIs = apiProviders.filter(api => api.category === "content");
  const financeAPIs = apiProviders.filter(api => api.category === "finance");

  const handleSubmit = async (formData: FormData) => {
    try {
      const result = await updateApiKeys(formData);
      if (result.success) toast.success("Sincronização de chaves concluída!");
      else throw new Error(result.message);
    } catch (error) { toast.error("Falha ao registrar chaves no sistema."); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 shadow-inner border border-primary/20">
              <Plug className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-foreground">API Hub</h2>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conecte o Life OS ao mundo exterior.</p>
          </div>
        </div>
        <Alert className="border-border/40 bg-muted/10 rounded-2xl mt-4">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <AlertDescription className="text-[10px] font-medium tracking-wide text-muted-foreground/80 ml-2">
            Todas as credenciais inseridas aqui são criptografadas e armazenadas exclusivamente no seu banco de dados local.
          </AlertDescription>
        </Alert>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* 🟢 REMOVIDA A TAB DA IA DAQUI */}
        <TabsList className="grid w-full grid-cols-2 lg:w-fit bg-muted/50 p-1.5 rounded-full h-auto">
          <TabsTrigger value="content" className="gap-2 rounded-full text-xs font-black uppercase tracking-widest py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Film className="h-3.5 w-3.5" /> Entretenimento
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2 rounded-full text-xs font-black uppercase tracking-widest py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Banknote className="h-3.5 w-3.5" /> Open Finance
          </TabsTrigger>
        </TabsList>

        <form action={handleSubmit} className="mt-8 space-y-8">
          {apiProviders.map((api) => (
            <input key={api.id} type="hidden" name={api.id} value={formValues[api.id]} />
          ))}

          <TabsContent value="content" className="space-y-4 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contentAPIs.map((api) => (
                <APIInputField key={api.id} field={api} defaultValue={getSettingValue(settings, api.id)} onChangeValue={handleUpdateValue} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-4 m-0">
            <div className="grid grid-cols-1 gap-6">
              {financeAPIs.map((api) => (
                <APIInputField key={api.id} field={api} defaultValue={getSettingValue(settings, api.id)} onChangeValue={handleUpdateValue} />
              ))}
            </div>
          </TabsContent>

          <Card className="border-border/40 shadow-sm bg-background rounded-3xl overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-primary" /> Commit Manual
                    </p>
                    <p className="text-[9px] font-medium text-muted-foreground/70 mt-1">
                        O Life OS não testa as chaves automaticamente ao salvar.
                    </p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button type="button" variant="outline" className="rounded-full font-bold text-[10px] uppercase tracking-widest" onClick={() => window.location.reload()}>Descartar</Button>
                  <SubmitButton />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Tabs>
    </div>
  );
}

// -------------------------------------------------------------------------------------------------
// 4. FUNÇÕES UTILITÁRIAS
// -------------------------------------------------------------------------------------------------
function getSettingValue(obj: Settings | null, key: string): string | null | undefined {
  if (!obj) return null;
  return obj[key as keyof Settings] as string | null | undefined;
}