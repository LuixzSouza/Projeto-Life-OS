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
import { Loader2, Globe, User, Key, Eye, EyeOff, ShieldCheck, Wand2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

/* =======================
   Tipagem explícita
======================= */

// Definimos um tipo específico para o estado das abas
type AccessType = "PERSONAL" | "CLIENT";

export interface AccessData {
  id?: string;
  title: string;
  username?: string | null;
  password?: string;
  url?: string | null;
  category?: "FINANCE" | "SOCIAL" | "WORK" | "OTHERS" | "CLIENT";
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
function generatePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%&*";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/* =======================
   Componente
======================= */
export function AccessForm({ item, onClose }: AccessFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState(item?.password ?? "");
  
  // Inicializa o estado com base se já existe um cliente salvo
  const [accessType, setAccessType] = useState<AccessType>(item?.client ? "CLIENT" : "PERSONAL");

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    
    // Se a aba selecionada for "PESSOAL", garantimos que não envie nome de cliente
    // mesmo que o usuário tenha digitado algo antes de trocar a aba.
    if (accessType === "PERSONAL") {
        formData.delete("client");
    }

    try {
      if (item) {
        await updateAccess(formData);
        toast.success("Acesso atualizado com sucesso");
      } else {
        await createAccess(formData);
        toast.success("Acesso salvo no cofre");
      }
      onClose();
    } catch {
      toast.error("Não foi possível salvar o acesso");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setPassword(pwd);
    toast.success("Senha forte gerada");
  };

  return (
    <div className="py-2">
      {/* Toggle Superior (Pessoal vs Cliente) */}
      <Tabs 
        value={accessType} 
        onValueChange={(v) => setAccessType(v as AccessType)} // ✅ Correção aplicada aqui (type assertion seguro)
        className="w-full mb-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="PERSONAL" className="gap-2">
             <User className="h-4 w-4" /> Pessoal
          </TabsTrigger>
          <TabsTrigger value="CLIENT" className="gap-2">
             <Briefcase className="h-4 w-4" /> Cliente
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form action={handleSubmit} className="space-y-5">
        {item?.id && <input type="hidden" name="id" value={item.id} />}

        {/* Campo Condicional: Nome do Cliente */}
        {accessType === "CLIENT" && (
            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-sm font-medium text-primary">Nome do Cliente / Projeto</Label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-primary" />
                    <Input
                        name="client"
                        defaultValue={item?.client ?? ""}
                        placeholder="Ex: Construtora Silva, E-commerce de Sapatos..."
                        className="pl-9 border-primary/30 bg-primary/5 focus-visible:ring-primary/30"
                        autoFocus
                    />
                </div>
            </div>
        )}

        {/* Título + Categoria */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
                {accessType === "CLIENT" ? "Serviço / Ferramenta" : "Serviço"}
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                name="title"
                defaultValue={item?.title}
                placeholder={accessType === "CLIENT" ? "Ex: WordPress Admin, cPanel" : "Ex: Google, Netflix"}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Categoria</Label>
            <Select name="category" defaultValue={item?.category ?? (accessType === "CLIENT" ? "WORK" : "SOCIAL")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORK">Trabalho / Dev</SelectItem>
                <SelectItem value="FINANCE">Financeiro</SelectItem>
                <SelectItem value="SOCIAL">Social</SelectItem>
                <SelectItem value="OTHERS">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Usuário */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Usuário / Email</Label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="username"
              defaultValue={item?.username ?? ""}
              placeholder="admin, root, email@cliente.com"
              className="pl-9"
            />
          </div>
        </div>

        {/* Senha */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-2">
            Senha
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          </Label>
          <div className="relative">
            <Key className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-9 pr-20 font-mono"
              required
            />
            <div className="absolute right-2 top-2 flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" onClick={() => setShowPassword((v) => !v)} className="h-7 w-7">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button type="button" size="icon" variant="ghost" onClick={handleGeneratePassword} className="h-7 w-7" title="Gerar senha">
                <Wand2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* URL */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Link de acesso (URL)</Label>
          <Input name="url" defaultValue={item?.url ?? ""} placeholder="https://..." />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Notas</Label>
          <Textarea
            name="notes"
            defaultValue={item?.notes ?? ""}
            placeholder="Porta FTP, chaves de API, observações..."
            rows={3}
          />
        </div>

        <DialogFooter className="pt-3">
          <Button type="submit" className={cn("w-full gap-2")} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {item ? "Salvar alterações" : "Guardar no cofre"}
          </Button>
        </DialogFooter>
      </form>
    </div>
  );
}