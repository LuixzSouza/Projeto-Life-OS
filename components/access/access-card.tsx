"use client";

import { useState } from "react";
import { AccessItem } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Importado para uso do cliente
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  Key,
  ShieldCheck,
  Hash,
  Lock,
  Loader2,
  Globe,
  Briefcase,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { deleteAccess, revealPassword } from "@/app/(dashboard)/access/actions";
import { AccessForm, AccessData } from "./access-form"; // Usando o tipo do form para edição
import { cn } from "@/lib/utils";

/* ---------------------------------- */
/* Category Styles Map                */
/* ---------------------------------- */
const CATEGORY_STYLES = {
  FINANCE: {
    icon: ShieldCheck,
    className: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
  },
  SOCIAL: {
    icon: Hash,
    className: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
  },
  WORK: {
    icon: Briefcase, // Mudei de Lock para Briefcase, pois Lock é mais genérico
    className: "text-primary bg-primary/10 border-primary/30",
  },
  OTHERS: {
    icon: Key,
    className: "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700",
  },
} as const;

type CategoryKey = keyof typeof CATEGORY_STYLES;

/* ---------------------------------- */
/* Component                          */
/* ---------------------------------- */
export function AccessCard({ item }: { item: AccessItem }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Mapeamento de estilo baseado na categoria
  const category = CATEGORY_STYLES[item.category as CategoryKey] ?? CATEGORY_STYLES.OTHERS;
  const Icon = category.icon;

  /* ---------------------------------- */
  /* Password Handling                  */
  /* ---------------------------------- */
  async function handleReveal() {
    if (visible) {
      setVisible(false);
      return;
    }

    if (password) {
      setVisible(true);
      return;
    }

    try {
      setLoading(true);
      // Revela a senha (assume que está criptografada no banco)
      const decrypted = await revealPassword(item.id);
      setPassword(decrypted);
      setVisible(true);
    } catch {
      toast.error("Erro: A senha não pôde ser descriptografada.");
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(value: string | null, label: string) {
    if (!value) {
      toast.info(`Nada para copiar (${label})`);
      return;
    }
    navigator.clipboard.writeText(value);
    toast.success(`${label} copiado`);
  }

  async function handleDelete() {
    // Ação real de deletar (sem try/catch aqui, o Next.js deve lidar com o erro)
    await deleteAccess(item.id);
    toast.success("Acesso removido do cofre");
  }

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */
  return (
    <Card className="group flex flex-col h-full border border-border/60 bg-card hover:shadow-lg hover:border-primary/40 transition-all duration-300">
      <CardContent className="p-5 flex flex-col h-full gap-4">
        
        {/* TOP SECTION: CLIENT & TITLE */}
        <div className="flex flex-col gap-2 min-h-[60px]">
          {item.client && (
            <Badge className="w-fit text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border-blue-500/20 mb-2">
              <Briefcase className="h-3 w-3 mr-1" /> {item.client}
            </Badge>
          )}

          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                "p-2.5 rounded-xl border shrink-0",
                category.className
              )}
              title={`Categoria: ${item.category}`}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-lg text-foreground truncate" title={item.title}>
                {item.title}
              </h3>
              <p
                className="text-xs font-mono text-muted-foreground truncate cursor-pointer hover:text-primary transition-colors mt-0.5"
                onClick={() => handleCopy(item.username, "Usuário")}
                title={`Usuário: ${item.username || "Não definido"} (Clique para copiar)`}
              >
                {item.username || "Sem usuário"}
              </p>
            </div>
          </div>
        </div>

        {/* PASSWORD VAULT */}
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Senha (Criptografada)
            </p>

            <div className="font-mono text-sm truncate font-medium">
              {loading ? (
                <span className="flex items-center gap-2 text-primary text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Descriptografando
                </span>
              ) : visible ? (
                <span className="text-foreground">{password}</span>
              ) : (
                <span className="tracking-widest text-muted-foreground">••••••••••••</span>
              )}
            </div>
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReveal}
              title={visible ? "Ocultar Senha" : "Revelar Senha (Descriptografar)"}
              className="text-primary hover:bg-primary/10 transition-colors"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleCopy(password, "Senha")}
              title="Copiar Senha"
              disabled={!password}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="mt-auto pt-2 flex flex-wrap gap-2">
          {item.url && (
            <a
              href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-[120px]"
            >
              <Button size="sm" className="w-full gap-2 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20">
                <ExternalLink className="h-4 w-4" />
                Acessar URL
              </Button>
            </a>
          )}

          {/* Botão de Edição */}
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 min-w-[120px] gap-2 hover:border-primary/50 hover:text-primary"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
              <DialogHeader className="p-6 pb-4 border-b">
                <DialogTitle>Editar {item.title}</DialogTitle>
              </DialogHeader>
              {/* Passamos o item completo para o formulário para pré-preencher */}
              <div className="p-6 pt-4">
                <AccessForm 
                  item={{ ...item, category: item.category as CategoryKey } as unknown as AccessData} 
                  onClose={() => setEditOpen(false)} 
                />
              </div>
            </DialogContent>
          </Dialog>

          {/* Botão de Excluir */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="w-full sm:w-auto mt-2 sm:mt-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir acesso permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você está prestes a deletar o acesso de **{item.title}**. Essa ação é irreversível e o dado criptografado será perdido.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}