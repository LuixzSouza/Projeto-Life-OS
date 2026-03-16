"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAccess, updateAccess } from "@/app/(dashboard)/access/actions";
import { toast } from "sonner";
import { 
  Loader2, Globe, User, Key, Eye, EyeOff, ShieldCheck, 
  Wand2, Briefcase, Building2, UserCircle, CheckCircle
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

function generatePassword(length = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%&*-_=+?";
  const allChars = upper + lower + numbers + symbols;
  
  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

export function AccessForm({ item, onClose }: AccessFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState(item?.password ?? "");
  const [accessType, setAccessType] = useState<AccessType>(item?.client ? "CLIENT" : "PERSONAL");

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
      if (item?.id) {
        formData.append("id", item.id);
        await updateAccess(formData);
        toast.success("Credencial atualizada.");
      } else {
        await createAccess(formData);
        toast.success("Nova chave gravada no cofre.");
      }
      onClose();
    } catch (error) {
      toast.error("Erro na sincronização.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setPassword(pwd);
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
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-11 bg-background border-border/40 focus-visible:ring-primary/20 rounded-xl font-mono tracking-widest text-sm"
                          required={!item?.id}
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

                  <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleGeneratePassword}
                      className="h-11 px-4 rounded-xl border-dashed border-primary/40 hover:bg-primary/5 hover:text-primary font-black uppercase tracking-widest text-[9px] gap-2"
                  >
                      <Wand2 className="h-3.5 w-3.5" /> Gerar
                  </Button>
              </div>
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