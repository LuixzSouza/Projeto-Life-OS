"use client";

import Link from "next/link";
import {
  Pencil, MoreHorizontal, Trash2,
  Copy, Check, Globe, MessageCircle, Tag as TagIcon,
  Briefcase, FileText, CalendarDays, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { clearMask, maskPhone } from "./business-helpers";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { ClientData, DeleteTarget } from "./business-types";

interface ClientCardProps {
  client: ClientData;
  copiedId: string | null;
  onCopyPhone: (phone: string, id: string) => void;
  onEditClient: (client: ClientData) => void;
  onDeleteTarget: (target: DeleteTarget) => void;
  onOpenConnections: (client: ClientData) => void;
}

// Card RESUMIDO do cliente: cabeçalho + resumo financeiro + contagem de
// contratos/faturas + atalho para a página de detalhe (/business/[id]).
export function ClientCard({
  client, copiedId, onCopyPhone, onEditClient, onDeleteTarget, onOpenConnections,
}: ClientCardProps) {
  const formatCurrency = useFormatCurrency();

  const now = new Date();
  const openInvoices = client.billings.flatMap(b => b.invoices)
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELED');
  const clientOverdue = openInvoices.filter(i => new Date(i.dueDate) < now).reduce((s, i) => s + i.value, 0);
  const clientReceivable = openInvoices.filter(i => new Date(i.dueDate) >= now).reduce((s, i) => s + i.value, 0);

  // Próxima fatura em aberto (a de vencimento mais cedo) para o "próximo passo".
  const nextInvoice = openInvoices.length
    ? [...openInvoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]
    : null;

  return (
    <div className="flex flex-col rounded-[1.5rem] border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">

      <div className="p-5 flex justify-between items-start border-b border-border/10 bg-muted/5">
        <div className="flex gap-3.5 items-center min-w-0 flex-1">
          <Avatar className="h-12 w-12 shrink-0 rounded-2xl border border-primary/10 shadow-inner">
            <AvatarImage src={client.imageUrl || undefined} className="object-cover" alt={client.name} />
            <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-xl">
              {client.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-base truncate text-foreground/90" title={client.name}>
              {client.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {client.company && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/5 text-primary border-none font-medium truncate max-w-[120px]">
                  {client.company}
                </Badge>
              )}
              {client.website && (
                <a
                  href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                  title={client.website}
                >
                  <Globe size={11} /> Site
                </a>
              )}
              {client.phone && (
                <button
                  onClick={() => onCopyPhone(client.phone!, client.id)}
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono"
                >
                  {maskPhone(client.phone)}
                  {copiedId === client.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                </button>
              )}
            </div>

            {client.friend && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground" title={`Contato: ${client.friend.name}`}>
                <Avatar className="h-4 w-4 border border-border/40">
                  <AvatarImage src={client.friend.imageUrl || undefined} className="object-cover" alt={client.friend.name} />
                  <AvatarFallback className="bg-muted text-[8px] font-bold">{client.friend.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium text-foreground/80 min-w-0">{client.friend.name}</span>
                {client.friend.phone && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://wa.me/55${clearMask(client.friend!.phone!)}`, "_blank");
                    }}
                    title={`Falar com ${client.friend.name} no WhatsApp`}
                    className="ml-0.5 flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors shrink-0"
                  >
                    <MessageCircle size={10} /> Zap
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/80">
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
            <DropdownMenuItem onClick={() => onEditClient(client)} className="cursor-pointer">
              <Pencil className="mr-2 h-4 w-4" /> Editar Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenConnections(client)} className="cursor-pointer">
              <TagIcon className="mr-2 h-4 w-4" /> Tags & Anexos
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={() => onDeleteTarget({ type: 'CLIENT', id: client.id, name: client.name })}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir Cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Resumo financeiro */}
      <div className="flex items-stretch divide-x divide-border/30 border-b border-border/10 bg-muted/5">
        <div className="flex-1 px-5 py-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">A Receber</p>
          <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(clientReceivable)}</p>
        </div>
        <div className="flex-1 px-5 py-3">
          <p className={cn("text-[9px] font-black uppercase tracking-widest", clientOverdue > 0 ? "text-rose-500" : "text-muted-foreground")}>Em Atraso</p>
          <p className={cn("text-sm font-bold font-mono", clientOverdue > 0 ? "text-rose-600" : "text-muted-foreground/50")}>{formatCurrency(clientOverdue)}</p>
        </div>
      </div>

      {/* Contagem + próximo passo + atalho de detalhe */}
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 font-semibold">
            <Briefcase size={13} className="text-primary/60" />
            {client.billings.length} {client.billings.length === 1 ? "contrato" : "contratos"}
          </span>
          <span className="flex items-center gap-1.5 font-semibold">
            <FileText size={13} className="text-primary/60" />
            {openInvoices.length} {openInvoices.length === 1 ? "fatura aberta" : "faturas abertas"}
          </span>
        </div>

        {nextInvoice && (
          <div className="flex items-center gap-2 text-[11px] rounded-xl bg-muted/30 border border-border/30 px-3 py-2">
            <CalendarDays size={13} className={cn("shrink-0", new Date(nextInvoice.dueDate) < now ? "text-rose-500" : "text-muted-foreground")} />
            <span className="truncate min-w-0 flex-1 font-medium text-foreground/80">{nextInvoice.title}</span>
            <span className={cn("font-bold font-mono shrink-0", new Date(nextInvoice.dueDate) < now ? "text-rose-600" : "text-muted-foreground")}>
              {new Date(nextInvoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
            </span>
          </div>
        )}

        <Link href={`/business/${client.id}`} className="mt-auto">
          <Button variant="outline" className="w-full rounded-xl font-bold h-11 group/abrir border-border/50 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all">
            Abrir detalhes
            <ArrowRight size={16} className="ml-2 group-hover/abrir:translate-x-1 transition-transform" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
