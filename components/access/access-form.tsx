"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { createAccess, updateAccess } from "@/app/(dashboard)/access/actions";
import { calculateStrength } from "./access-helpers";
import { toast } from "sonner";
import {
  Loader2, Globe, User, Key, Eye, EyeOff, ShieldCheck,
  Wand2, Briefcase, Building2, UserCircle, CheckCircle, SlidersHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccessType = "PERSONAL" | "CLIENT";

export interface AccessData {
  id?: string;
  title: string;
  username?: string | null;
  password?: string;
  url?: string | null;
  category?: string;
  notes?: string | null;
  client?: string | null;
}

interface AccessFormProps {
  item?: AccessData;
  onClose: () => void;
}

interface GenOptions {
  length: number;
  numbers: boolean;
  symbols: boolean;
}

// Gerador criptograficamente seguro (CSPRNG via Web Crypto), com classes opcionais.
function generatePassword({ length, numbers: useNumbers, symbols: useSymbols }: GenOptions): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%&*-_=+?";

  let pool = upper + lower;
  if (useNumbers) pool += numbers;
  if (useSymbols) pool += symbols;

  // Índice aleatório uniforme usando getRandomValues (evita Math.random previsível).
  const rnd = (max: number) => {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  };

  const len = Math.max(6, length);
  // Garante ao menos 1 caractere de cada classe ativa.
  const required: string[] = [upper[rnd(upper.length)], lower[rnd(lower.length)]];
  if (useNumbers) required.push(numbers[rnd(numbers.length)]);
  if (useSymbols) required.push(symbols[rnd(symbols.length)]);

  const chars = [...required];
  for (let i = chars.length; i < len; i++) chars.push(pool[rnd(pool.length)]);

  // Fisher–Yates com CSPRNG.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export function AccessForm({ item, onClose }: AccessFormProps) {
  const isEditing = Boolean(item?.id);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Em edição NÃO pré-preenchemos a senha (o valor salvo é cifrado/ilegível).
  // Campo vazio = manter a senha atual.
  const [password, setPassword] = useState("");
  const [accessType, setAccessType] = useState<AccessType>(item?.client ? "CLIENT" : "PERSONAL");

  // Opções do gerador de senhas.
  const [genOptions, setGenOptions] = useState<GenOptions>({ length: 20, numbers: true, symbols: true });

  // Força calculada ao vivo (mesma métrica da auditoria do cofre).
  const strength = calculateStrength(password);
  const strengthColor = strength >= 80 ? "bg-emerald-500" : strength >= 50 ? "bg-amber-500" : "bg-rose-500";
  const strengthLabel = strength >= 80 ? "Forte" : strength >= 50 ? "Média" : strength > 0 ? "Fraca" : "";

  const handleSubmit = async (formData: FormData) => {
    const title = formData.get("title")?.toString().trim();
    const currentPassword = formData.get("password")?.toString().trim();

    if (!title) {
        toast.warning("Título obrigatório.");
        return;
    }

    if (!item?.id && !currentPassword) {
        toast.warning("Senha obrigatória para novos registros.");
        return;
    }

    setIsLoading(true);
    if (accessType === "PERSONAL") formData.delete("client");

    try {
      let breachCount = 0;
      if (item?.id) {
        formData.append("id", item.id);
        const res = await updateAccess(formData);
        breachCount = res.breachCount ?? 0;
        toast.success("Credencial atualizada.");
      } else {
        const res = await createAccess(formData);
        breachCount = res.breachCount ?? 0;
        toast.success("Nova chave gravada no cofre.");
      }
      // A senha foi salva, mas já circula em vazamentos públicos: avisa na hora.
      if (breachCount > 0) {
        toast.warning(
          `Atenção: esta senha aparece em ${breachCount.toLocaleString("pt-BR")} vazamento(s) público(s). Considere trocá-la.`,
          { duration: 8000 },
        );
      }
      onClose();
    } catch (error) {
      toast.error("Erro na sincronização.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword(genOptions);
    setPassword(pwd);
    setShowPassword(true);
    toast.success("Senha de alta entropia gerada.", {
        icon: <ShieldCheck className="h-4 w-4 text-emerald-500" />
    });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <fieldset disabled={isLoading} className="group disabled:opacity-70 transition-opacity space-y-6">
        
        {/* TABS TÁTICAS */}
        <Tabs value={accessType} onValueChange={(v) => setAccessType(v as AccessType)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/20 border border-border/40 h-12 rounded-2xl">
              <TabsTrigger value="PERSONAL" className="gap-2 h-full rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  <UserCircle className="h-4 w-4 opacity-70" /> Pessoal
              </TabsTrigger>
              <TabsTrigger value="CLIENT" className="gap-2 h-full rounded-xl font-black uppercase tracking-widest text-[10px] data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  <Briefcase className="h-4 w-4 opacity-70" /> Cliente
              </TabsTrigger>
            </TabsList>
        </Tabs>

        <form action={handleSubmit} className="space-y-6">
            
            {/* CAMPO CONDICIONAL: CLIENTE */}
            {accessType === "CLIENT" && (
                <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identificação do Cliente</Label>
                    <div className="relative group">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary group-focus-within:text-primary transition-colors z-10" />
                        <Input
                            name="client"
                            defaultValue={item?.client ?? ""}
                            placeholder="Ex: Construtora Silva"
                            className="pl-10 h-12 bg-muted/10 border-border/40 focus-visible:ring-primary/20 rounded-xl font-bold text-sm"
                            required={accessType === "CLIENT"}
                        />
                    </div>
                </div>
            )}

            {/* GRID: TÍTULO E CATEGORIA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      {accessType === "CLIENT" ? "Serviço / Instância" : "Plataforma"}
                  </Label>
                  <div className="relative group">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                    <Input
                        name="title"
                        defaultValue={item?.title}
                        placeholder={accessType === "CLIENT" ? "Ex: WP Admin" : "Ex: Netflix"}
                        className="pl-10 h-12 bg-muted/10 border-border/40 focus-visible:ring-primary/20 rounded-xl font-bold text-sm"
                        required
                    />
                  </div>
              </div>

              <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Categoria de Segurança</Label>
                  <Select name="category" defaultValue={item?.category ?? (accessType === "CLIENT" ? "WORK" : "SOCIAL")}>
                    <SelectTrigger className="h-12 bg-muted/10 border-border/40 rounded-xl font-bold text-xs uppercase tracking-widest">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="WORK" className="font-bold text-xs uppercase">Trabalho / Dev</SelectItem>
                        <SelectItem value="FINANCE" className="font-bold text-xs uppercase">Financeiro</SelectItem>
                        <SelectItem value="SOCIAL" className="font-bold text-xs uppercase">Social</SelectItem>
                        <SelectItem value="OTHERS" className="font-bold text-xs uppercase">Outros</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
            </div>

            {/* USUÁRIO */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">ID de Usuário / Email</Label>
              <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                  <Input
                    name="username"
                    defaultValue={item?.username ?? ""}
                    placeholder="admin, root, seu@email.com"
                    className="pl-10 h-12 bg-muted/10 border-border/40 focus-visible:ring-primary/20 rounded-xl font-mono text-sm"
                    autoComplete="off"
                  />
              </div>
            </div>

            {/* SENHA & GERADOR */}
            <div className="space-y-2 p-4 bg-muted/10 rounded-2xl border border-border/40 shadow-inner">
              <div className="flex justify-between items-center mb-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chave de Acesso</Label>
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-tighter text-emerald-500 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <ShieldCheck className="h-3 w-3" /> Criptografado
                  </div>
              </div>
              
              <div className="flex gap-2">
                  <div className="relative flex-1 group">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                      <Input
                          name="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={isEditing ? "Deixe em branco para manter a atual" : "••••••••"}
                          className="pl-10 pr-10 h-11 bg-background border-border/40 focus-visible:ring-primary/20 rounded-xl font-mono tracking-widest text-sm"
                          required={!isEditing}
                          autoComplete="new-password"
                      />
                      <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-primary"
                      >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                  </div>

                  {/* Opções do gerador (comprimento, números, símbolos) */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="icon" title="Opções do gerador" className="h-11 w-11 shrink-0 rounded-xl border-border/40 hover:bg-muted">
                        <SlidersHorizontal className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-72 rounded-2xl p-5 space-y-5">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Comprimento</Label>
                          <span className="text-sm font-black text-primary font-mono">{genOptions.length}</span>
                        </div>
                        <Slider
                          min={8} max={48} step={1}
                          value={[genOptions.length]}
                          onValueChange={([v]) => setGenOptions((o) => ({ ...o, length: v }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Incluir números</Label>
                        <Switch checked={genOptions.numbers} onCheckedChange={(c) => setGenOptions((o) => ({ ...o, numbers: c }))} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Incluir símbolos</Label>
                        <Switch checked={genOptions.symbols} onCheckedChange={(c) => setGenOptions((o) => ({ ...o, symbols: c }))} />
                      </div>
                      <Button type="button" onClick={handleGeneratePassword} className="w-full h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2">
                        <Wand2 className="h-3.5 w-3.5" /> Gerar agora
                      </Button>
                    </PopoverContent>
                  </Popover>

                  <Button
                      type="button"
                      variant="outline"
                      onClick={handleGeneratePassword}
                      className="h-11 px-4 rounded-xl border-dashed border-primary/40 hover:bg-primary/5 hover:text-primary font-black uppercase tracking-widest text-[9px] gap-2"
                  >
                      <Wand2 className="h-3.5 w-3.5" /> Gerar
                  </Button>
              </div>

              {/* Medidor de força ao vivo */}
              {password && (
                <div className="space-y-1.5 pt-1 animate-in fade-in duration-300">
                  <div className="h-1.5 w-full bg-background border border-border/40 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-500 ease-out", strengthColor)} style={{ width: `${strength}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Força: <span className={cn(strength >= 80 ? "text-emerald-500" : strength >= 50 ? "text-amber-500" : "text-rose-500")}>{strengthLabel}</span></span>
                    <span className="text-[9px] font-mono text-muted-foreground">{password.length} caracteres</span>
                  </div>
                </div>
              )}
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ponto de Acesso (URL)</Label>
              <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors z-10" />
                <Input name="url" defaultValue={item?.url ?? ""} placeholder="https://..." className="pl-10 h-11 bg-muted/10 border-border/40 focus-visible:ring-primary/20 rounded-xl font-mono text-xs" />
              </div>
            </div>

            {/* NOTAS */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Registros de Auditoria / Notas</Label>
              <Textarea
                  name="notes"
                  defaultValue={item?.notes ?? ""}
                  placeholder="Instruções de segurança, backups ou chaves secundárias..."
                  rows={3}
                  className="bg-muted/10 border-border/40 focus-visible:ring-primary/20 rounded-2xl resize-none text-sm font-medium p-4 leading-relaxed"
              />
            </div>

            {/* BOTÕES DE AÇÃO */}
            <div className="pt-6 border-t border-border/40 flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose} 
                className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="flex-[2] h-12 rounded-xl bg-foreground text-background hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 stroke-[3]" />
                    {item ? "Atualizar Credencial" : "Sincronizar no Cofre"}
                  </span>
                )}
              </Button>
            </div>
        </form>
      </fieldset>
    </div>
  );
}