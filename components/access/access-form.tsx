"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { createAccess, updateAccess } from "@/app/(dashboard)/access/actions";
import { toast } from "sonner";
import {
  Loader2,
  Globe,
  User,
  Key,
  Eye,
  EyeOff,
  ShieldCheck,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* =======================
   Tipagem explícita
======================= */
export interface AccessData {
  id?: string;
  title: string;
  username?: string | null;
  password?: string;
  url?: string | null;
  category?: "FINANCE" | "SOCIAL" | "WORK" | "OTHERS";
  notes?: string | null;
}

interface AccessFormProps {
  item?: AccessData;
  onClose: () => void;
}

/* =======================
   Utils
======================= */
function generatePassword(length = 16): string {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%&*";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/* =======================
   Component
======================= */
export function AccessForm({ item, onClose }: AccessFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState(item?.password ?? "");

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
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
    <form action={handleSubmit} className="space-y-5 py-2">
      {item?.id && <input type="hidden" name="id" value={item.id} />}

      {/* Título + Categoria */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Serviço</Label>
          <div className="relative">
            <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="title"
              defaultValue={item?.title}
              placeholder="Ex: Google, GitHub"
              className="pl-9"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Categoria</Label>
          <Select name="category" defaultValue={item?.category ?? "SOCIAL"}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FINANCE">Financeiro</SelectItem>
              <SelectItem value="SOCIAL">Social</SelectItem>
              <SelectItem value="WORK">Trabalho</SelectItem>
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
            placeholder="email@dominio.com"
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
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowPassword((v) => !v)}
              className="h-7 w-7"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={handleGeneratePassword}
              className="h-7 w-7"
              title="Gerar senha forte"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Recomendado: mínimo de 12 caracteres, letras, números e símbolos.
        </p>
      </div>

      {/* URL */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Link de acesso</Label>
        <Input
          name="url"
          defaultValue={item?.url ?? ""}
          placeholder="https://..."
        />
      </div>

      {/* Notas */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Notas</Label>
        <Textarea
          name="notes"
          defaultValue={item?.notes ?? ""}
          placeholder="PINs, perguntas de segurança, observações…"
          rows={3}
        />
      </div>

      {/* Ações */}
      <DialogFooter className="pt-3">
        <Button
          type="submit"
          className={cn("w-full gap-2")}
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {item ? "Salvar alterações" : "Guardar no cofre"}
        </Button>
      </DialogFooter>
    </form>
  );
}
