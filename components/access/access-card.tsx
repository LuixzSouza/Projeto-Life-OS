"use client";

import { useState } from "react";
import { AccessItem } from "@prisma/client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil, Trash2, Briefcase, ExternalLink, MoreHorizontal, CalendarClock,
  ShieldAlert, Repeat2, ShieldX, History, Share2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteAccess } from "@/app/(dashboard)/access/actions";
import { type AccessData } from "./access-form";
import { cn } from "@/lib/utils";

import { CATEGORY_CONFIG, getDomain, formatDate, type CategoryKey } from "./access-helpers";
import { CredentialFields } from "./credential-fields";
import { AccessEditDialog } from "./access-edit-dialog";
import { AccessDeleteDialog } from "./access-delete-dialog";
import { ShareAccessDialog } from "./share-access-dialog";

export function AccessCard({ item, strength, reused = false, breachCount }: { item: AccessItem; strength?: number; reused?: boolean; breachCount?: number }) {
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Flags de segurança vindas da auditoria do servidor (sem revelar a senha).
  const isWeak = typeof strength === "number" && strength < 50;
  const isBreached = typeof breachCount === "number" && breachCount > 0;
  // Sem alteração há +1 ano: lembrete de rotação (updatedAt é a melhor proxy sem schema novo).
  const isStale = Date.now() - new Date(item.updatedAt).getTime() > 365 * 864e5;

  // --- Configs de Categoria ---
  const categoryKey = (Object.keys(CATEGORY_CONFIG).includes(item.category)
    ? item.category
    : "OTHERS") as CategoryKey;

  const catConfig = CATEGORY_CONFIG[categoryKey];
  const CategoryIcon = catConfig.icon;

  const domain = getDomain(item.url);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : undefined;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccess(item.id);
      toast.success("Credencial expurgada.");
    } catch {
      toast.error("Erro ao deletar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formData: AccessData = {
    id: item.id,
    title: item.title,
    username: item.username,
    password: item.password,
    url: item.url,
    category: item.category,
    notes: item.notes,
    client: item.client,
  };

  return (
    <>
      <Card className="group relative flex flex-col h-full bg-card border-border/40 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden rounded-2xl">

        {/* Faixa decorativa HUD */}
        <div className={cn("absolute top-0 left-0 w-full h-1.5 transition-colors group-hover:h-2", catConfig.bg.replace("/10", "/50"))} />

        {/* --- HEADER DO CARD --- */}
        <div className="p-6 pb-2 flex items-start gap-4">
          <div className="shrink-0 relative">
            <Avatar className="h-12 w-12 rounded-[1rem] border border-border/40 shadow-sm bg-background">
              <AvatarImage src={faviconUrl} alt={item.title} className="p-2 object-contain" />
              <AvatarFallback className={cn("rounded-[1rem]", catConfig.bg)}>
                <CategoryIcon className={cn("h-5 w-5", catConfig.color)} />
              </AvatarFallback>
            </Avatar>

            {item.client && (
              <div className="absolute -bottom-2 -right-2 bg-background border border-border/40 rounded-full p-0.5 shadow-sm" title={`Cliente: ${item.client}`}>
                <div className="bg-blue-500/10 p-1.5 rounded-full">
                  <Briefcase className="h-3 w-3 text-blue-500" />
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex justify-between items-start">
              <h3 className="font-semibold text-sm text-foreground truncate pr-2" title={item.title}>
                {item.title}
              </h3>

              {/* Menu Tático */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais ações" className="h-7 w-7 -mr-2 -mt-1 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 shadow-xl">
                  <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 text-sm font-medium cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShareOpen(true)} className="gap-2 text-sm font-medium cursor-pointer">
                    <Share2 className="h-3.5 w-3.5" /> Compartilhar
                  </DropdownMenuItem>
                  {item.url && (
                    <DropdownMenuItem onClick={() => window.open(item.url?.startsWith("http") ? item.url : `https://${item.url}`, "_blank")} className="gap-2 text-sm font-medium cursor-pointer">
                      <ExternalLink className="h-3.5 w-3.5" /> Acessar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border/40" />
                  <DropdownMenuItem onClick={() => setDeleteAlertOpen(true)} className="gap-2 text-sm font-medium cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {domain || (item.client ? item.client : catConfig.label)}
            </p>
          </div>
        </div>

        {/* --- CORPO DO CARD (Inputs) --- */}
        <CardContent className="p-6 flex flex-col gap-4 flex-1">
          <CredentialFields item={item} />
        </CardContent>

        {/* --- FOOTER DE METADADOS --- */}
        <CardFooter className="px-6 py-4 bg-muted/10 border-t border-border/40 flex justify-between items-center gap-2">
          <div className="flex items-center gap-1.5 text-muted-foreground shrink-0" title="Última Sincronização">
            <CalendarClock className="h-3 w-3 opacity-60" />
            <span className="text-[11px] font-medium">{formatDate(item.updatedAt || new Date())}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {/* Selo: senha vazada em base pública (HaveIBeenPwned) */}
            {isBreached && (
              <span className="flex items-center gap-1 bg-rose-600/15 text-rose-600 px-2 py-0.5 rounded-md border border-rose-600/30" title={`Encontrada em ${breachCount?.toLocaleString("pt-BR")} vazamentos — troque imediatamente`}>
                <ShieldX className="h-2.5 w-2.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Vazada</span>
              </span>
            )}

            {/* Selo: senha frágil (auditoria do servidor) */}
            {isWeak && (
              <span className="flex items-center gap-1 bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-md border border-rose-500/20" title="Senha fraca — considere trocar">
                <ShieldAlert className="h-2.5 w-2.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Fraca</span>
              </span>
            )}

            {/* Selo: senha reutilizada em outro item */}
            {reused && (
              <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md border border-amber-500/20" title="Senha reutilizada em outra credencial">
                <Repeat2 className="h-2.5 w-2.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Repetida</span>
              </span>
            )}

            {/* Selo: credencial sem alteração há mais de 1 ano (rotação) */}
            {isStale && !isBreached && !isWeak && (
              <span className="flex items-center gap-1 bg-zinc-500/10 text-zinc-500 px-2 py-0.5 rounded-md border border-zinc-500/20" title="Sem alteração há mais de 1 ano — considere rotacionar a senha">
                <History className="h-2.5 w-2.5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Antiga</span>
              </span>
            )}

            {item.notes && (
              <span className="flex items-center gap-1.5 bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/40" title="Possui notas">
                <span className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Anotado</span>
              </span>
            )}
          </div>
        </CardFooter>
      </Card>

      <AccessEditDialog open={editOpen} onOpenChange={setEditOpen} item={formData} />
      <ShareAccessDialog open={shareOpen} onOpenChange={setShareOpen} item={formData} />
      <AccessDeleteDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen} isDeleting={isDeleting} onConfirm={handleDelete} />
    </>
  );
}
