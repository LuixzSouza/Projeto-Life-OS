"use client";

import { useState } from "react";
import { AccessItem } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { toast } from "sonner";
import { deleteAccess, revealPassword } from "@/app/(dashboard)/access/actions";
import { AccessForm } from "./access-form";
import { cn } from "@/lib/utils";

/* ---------------------------------- */
/* Category Styles Map                */
/* ---------------------------------- */
const CATEGORY_STYLES = {
  FINANCE: {
    icon: ShieldCheck,
    className:
      "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
  },
  SOCIAL: {
    icon: Hash,
    className:
      "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
  },
  WORK: {
    icon: Lock,
    className:
      "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800",
  },
  OTHERS: {
    icon: Key,
    className:
      "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700",
  },
} as const;

type CategoryKey = keyof typeof CATEGORY_STYLES;

/* ---------------------------------- */
/* Component                          */
/* ---------------------------------- */
export function AccessCard({ item }: { item: AccessItem }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const category =
    CATEGORY_STYLES[item.category as CategoryKey] ??
    CATEGORY_STYLES.OTHERS;

  const Icon = category.icon;

  /* ---------------------------------- */
  /* Password Handling                  */
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
      const decrypted = await revealPassword(item.id);
      setPassword(decrypted);
      setVisible(true);
    } catch {
      toast.error("Erro ao revelar a senha.");
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
    await deleteAccess(item.id);
    toast.success("Acesso removido do cofre");
  }

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */
  return (
    <Card className="group h-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:shadow-lg transition-all">
      <CardContent className="p-5 flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "p-2.5 rounded-xl border shrink-0",
                category.className
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">
                {item.title}
              </h3>
              <p
                className="text-xs font-mono text-muted-foreground truncate cursor-pointer hover:text-primary"
                onClick={() => handleCopy(item.username, "Usuário")}
              >
                {item.username || "Sem usuário"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Acesso</DialogTitle>
                </DialogHeader>
                <AccessForm item={{ ...item, category: item.category as CategoryKey }} onClose={() => setEditOpen(false)} />
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir acesso?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação é irreversível.
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
        </div>

        {/* Password Vault */}
        <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between gap-2">
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Senha
            </p>

            <div className="font-mono text-sm truncate">
              {loading ? (
                <span className="flex items-center gap-2 text-primary text-xs">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Descriptografando
                </span>
              ) : visible ? (
                password
              ) : (
                <span className="tracking-widest">••••••••</span>
              )}
            </div>
          </div>

          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={handleReveal}
              title={visible ? "Ocultar" : "Revelar"}
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>

            <Button
              size="icon"
              variant="ghost"
              onClick={() => handleCopy(password, "Senha")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto flex gap-2">
          {item.url && (
            <a
              href={
                item.url.startsWith("http")
                  ? item.url
                  : `https://${item.url}`
              }
              target="_blank"
              rel="noreferrer"
              className="flex-1"
            >
              <Button
                size="sm"
                className="w-full gap-2"
              >
                <Globe className="h-4 w-4" />
                Acessar
              </Button>
            </a>
          )}

          {item.username && (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 gap-2"
              onClick={() => handleCopy(item.username, "Usuário")}
            >
              <Copy className="h-4 w-4" />
              Usuário
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
