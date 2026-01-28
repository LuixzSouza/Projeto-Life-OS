"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createAccess, updateAccess } from "@/app/(dashboard)/access/actions";
import { toast } from "sonner";
import { 
  Loader2, Globe, User, Key, Eye, EyeOff, ShieldCheck, 
  Wand2, Briefcase, Building2, UserCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =======================
   Tipagem
======================= */
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

/* =======================
   Utils
======================= */
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

/* =======================
   Componente Principal
======================= */
export function AccessForm({ item, onClose }: AccessFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState(item?.password ?? "");
  const [accessType, setAccessType] = useState<AccessType>(item?.client ? "CLIENT" : "PERSONAL");

  // --- Validação e Envio ---
  const handleSubmit = async (formData: FormData) => {
    // 1. Validação Básica Client-Side
    const title = formData.get("title")?.toString().trim();
    const currentPassword = formData.get("password")?.toString().trim();

    if (!title) {
        toast.warning("O título do acesso é obrigatório.");
        return;
    }

    if (!item?.id && !currentPassword) {
        toast.warning("Para novos acessos, a senha é obrigatória.");
        return;
    }

    setIsLoading(true);
    
    // 2. Limpeza de Dados
    if (accessType === "PERSONAL") {
        formData.delete("client");
    }

    try {
      if (item?.id) {
        formData.append("id", item.id);
        await updateAccess(formData);
        toast.success("Acesso atualizado com sucesso!");
      } else {
        await createAccess(formData);
        toast.success("Novo acesso salvo no cofre!");
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setPassword(pwd);
    toast.success("Senha forte gerada", {
        description: "Lembre-se de salvar o formulário.",
        icon: <Key className="h-4 w-4 text-emerald-500" />
    });
  };

  return (
    <div className="py-1">
      {/* FIELDSET: O segredo para UX robusta. 
         Desabilita TUDO dentro dele quando isLoading for true.
      */}
      <fieldset disabled={isLoading} className="group disabled:opacity-80 transition-opacity space-y-5">
        
        {/* Toggle Superior */}
        <Tabs 
            value={accessType} 
            onValueChange={(v) => setAccessType(v as AccessType)} 
            className="w-full mb-6"
        >
            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 h-10">
            <TabsTrigger value="PERSONAL" className="gap-2 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">
                <UserCircle className="h-4 w-4" /> Pessoal
            </TabsTrigger>
            <TabsTrigger value="CLIENT" className="gap-2 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm">
                <Briefcase className="h-4 w-4" /> Cliente / Trabalho
            </TabsTrigger>
            </TabsList>
        </Tabs>

        <form action={handleSubmit} className="space-y-5">
            {/* Campo Condicional: Nome do Cliente */}
            {accessType === "CLIENT" && (
                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                    <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Nome do Cliente / Projeto</Label>
                    <div className="relative group focus-within:ring-2 ring-primary/20 rounded-md">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500 group-focus-within:text-blue-600 transition-colors" />
                        <Input
                            name="client"
                            defaultValue={item?.client ?? ""}
                            placeholder="Ex: Construtora Silva..."
                            className="pl-9 border-blue-200 bg-blue-50/50 focus-visible:ring-0 dark:bg-blue-950/10 dark:border-blue-900"
                            autoFocus
                            required={accessType === "CLIENT"}
                        />
                    </div>
                </div>
            )}

            {/* Grid: Título e Categoria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1">
                    {accessType === "CLIENT" ? "Serviço" : "Título"}
                </Label>
                <div className="relative group">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    name="title"
                    defaultValue={item?.title}
                    placeholder={accessType === "CLIENT" ? "Ex: WP Admin" : "Ex: Netflix"}
                    className="pl-9"
                    required
                    autoComplete="off"
                />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Categoria</Label>
                <Select name="category" defaultValue={item?.category ?? (accessType === "CLIENT" ? "WORK" : "SOCIAL")}>
                <SelectTrigger className="bg-background">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="WORK">Trabalho / Dev</SelectItem>
                    <SelectItem value="FINANCE">Financeiro / Banco</SelectItem>
                    <SelectItem value="SOCIAL">Social / Pessoal</SelectItem>
                    <SelectItem value="OTHERS">Outros</SelectItem>
                </SelectContent>
                </Select>
            </div>
            </div>

            {/* Usuário */}
            <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Usuário / Email</Label>
            <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                name="username"
                defaultValue={item?.username ?? ""}
                placeholder="admin, root, seu@email.com"
                className="pl-9"
                autoComplete="new-username"
                />
            </div>
            </div>

            {/* --- SENHA --- */}
            <div className="space-y-1.5">
            <div className="flex justify-between items-center px-1">
                <Label className="text-xs font-semibold uppercase text-muted-foreground">Senha</Label>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                    <ShieldCheck className="h-3 w-3" /> Protegida
                </span>
            </div>
            
            <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-10 font-mono tracking-wide"
                        required={!item?.id} // Obrigatório apenas se for criação
                        autoComplete="new-password"
                    />
                    <Button 
                        type="button" 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => setShowPassword((v) => !v)} 
                        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </div>

                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGeneratePassword}
                    className="shrink-0 bg-muted/50 hover:bg-primary/10 hover:text-primary border-dashed"
                    title="Gerar nova senha aleatória"
                >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Gerar
                </Button>
            </div>
            </div>

            {/* URL */}
            <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Link de Acesso (URL)</Label>
            <Input name="url" defaultValue={item?.url ?? ""} placeholder="https://..." className="font-mono text-sm" />
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase text-muted-foreground ml-1">Notas Adicionais</Label>
            <Textarea
                name="notes"
                defaultValue={item?.notes ?? ""}
                placeholder="Porta FTP, chaves de API, perguntas de segurança..."
                rows={3}
                className="resize-none"
            />
            </div>

            {/* Footer com Loading State */}
            <DialogFooter className="pt-4 border-t mt-4 gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancelar
                </Button>
                <Button type="submit" className={cn("gap-2 min-w-[140px]")} disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                        </>
                    ) : (
                        item ? "Salvar Alterações" : "Criar Acesso"
                    )}
                </Button>
            </DialogFooter>
        </form>
      </fieldset>
    </div>
  );
}