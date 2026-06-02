"use client";

import {
  Phone, CheckCircle2, AlertCircle, Briefcase,
  Pencil, MoreHorizontal, Trash2, Circle,
  CalendarDays, Copy, Check, Plus, Globe, MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { clearMask, maskPhone } from "./business-helpers";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { BillingData, ClientData, DeleteTarget, InvoiceData } from "./business-types";

interface ClientCardProps {
  client: ClientData;
  copiedId: string | null;
  onCopyPhone: (phone: string, id: string) => void;
  onEditClient: (client: ClientData) => void;
  onDeleteTarget: (target: DeleteTarget) => void;
  onNewBilling: (clientId: string) => void;
  onEditBilling: (billing: BillingData) => void;
  onEditInvoice: (invoice: InvoiceData) => void;
  onReceiveInvoice: (invoice: InvoiceData) => void;
  onCopyCharge: (clientName: string, billing: BillingData) => void;
  onWhatsapp: (phone: string, clientName: string, billing: BillingData) => void;
}

export function ClientCard({
  client, copiedId, onCopyPhone, onEditClient, onDeleteTarget,
  onNewBilling, onEditBilling, onEditInvoice, onReceiveInvoice, onCopyCharge, onWhatsapp,
}: ClientCardProps) {
  const formatCurrency = useFormatCurrency();

  // Resumo financeiro do cliente (visão rápida no topo do card).
  const now = new Date();
  const openInvoices = client.billings.flatMap(b => b.invoices)
    .filter(i => i.status !== 'PAID' && i.status !== 'CANCELED');
  const clientOverdue = openInvoices
    .filter(i => new Date(i.dueDate) < now)
    .reduce((s, i) => s + i.value, 0);
  const clientReceivable = openInvoices
    .filter(i => new Date(i.dueDate) >= now)
    .reduce((s, i) => s + i.value, 0);

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
                  target="_blank"
                  rel="noreferrer"
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
                  {copiedId === client.id ? <Check size={10} className="text-emerald-500"/> : <Copy size={10}/>}
                </button>
              )}
            </div>

            {/* Conexão vinculada (pessoa de contato) */}
            {client.friend && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground" title={`Contato: ${client.friend.name}`}>
                <Avatar className="h-4 w-4 border border-border/40">
                  <AvatarImage src={client.friend.imageUrl || undefined} className="object-cover" alt={client.friend.name} />
                  <AvatarFallback className="bg-muted text-[8px] font-bold">
                    {client.friend.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate font-medium text-foreground/80 min-w-0">{client.friend.name}</span>
                {client.friend.jobTitle && <span className="truncate opacity-70 hidden sm:inline">· {client.friend.jobTitle}</span>}
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

      {/* Resumo financeiro do cliente */}
      {(clientReceivable > 0 || clientOverdue > 0) && (
        <div className="flex items-stretch divide-x divide-border/30 border-b border-border/10 bg-muted/5">
          <div className="flex-1 px-5 py-2.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">A Receber</p>
            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatCurrency(clientReceivable)}</p>
          </div>
          <div className="flex-1 px-5 py-2.5">
            <p className={cn("text-[9px] font-black uppercase tracking-widest", clientOverdue > 0 ? "text-rose-500" : "text-muted-foreground")}>Em Atraso</p>
            <p className={cn("text-sm font-bold font-mono", clientOverdue > 0 ? "text-rose-600" : "text-muted-foreground/50")}>{formatCurrency(clientOverdue)}</p>
          </div>
        </div>
      )}

      <div className="p-5 flex-1">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-2">
            <Briefcase size={12} className="text-primary/60"/> Contratos e Projetos
          </span>
          <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary rounded-lg" onClick={() => onNewBilling(client.id)}>
            <Plus size={14} className="mr-1" /> Novo
          </Button>
        </div>

        <ScrollArea className="h-[280px] pr-3">
          <div className="space-y-4">
            {client.billings.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
                  <p className="text-xs font-medium text-muted-foreground">Nenhum contrato ativo.</p>
              </div>
            ) : (
              client.billings.map((billing) => {
                // Faturas canceladas não entram no cálculo de progresso (senão nunca chega a 100%).
                const relevantInvoices = billing.invoices.filter(i => i.status !== 'CANCELED');
                const paidInvoices = relevantInvoices.filter(i => i.status === 'PAID').length;
                const totalInvoices = relevantInvoices.length;
                const progress = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
                const isCompleted = progress === 100;

                return (
                  <div key={billing.id} className="rounded-xl border border-border/50 bg-background/40 overflow-hidden shadow-sm group/billing">
                    <div className="p-3 border-b border-border/30 bg-muted/20 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                            <div className="min-w-0 flex-1">
                                <p className={cn("font-bold text-sm truncate", isCompleted && "text-muted-foreground line-through decoration-2")}>
                                    {billing.title}
                                </p>
                                <p className="text-[11px] font-mono text-primary font-bold mt-0.5">
                                    {formatCurrency(billing.totalValue)}
                                </p>
                            </div>
                            <div className="flex gap-1 items-center">
                                {/* 🟢 Copia a mensagem dinâmica do projeto */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 opacity-0 group-hover/billing:opacity-100 transition-opacity"
                                    onClick={() => onCopyCharge(client.name, billing)}
                                    title="Copiar Resumo da Cobrança"
                                >
                                    <Copy size={13} />
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/billing:opacity-100 transition-opacity">
                                            <MoreHorizontal size={14} />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                                        <DropdownMenuItem onClick={() => onEditBilling(billing)} className="cursor-pointer font-medium">Ajustar Título/Status</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive cursor-pointer font-medium" onClick={() => onDeleteTarget({ type: 'BILLING', id: billing.id, name: billing.title })}>Excluir Projeto</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Progress value={progress} className="h-1.5 flex-1 bg-muted" indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-primary"} />
                            <span className={cn("text-[10px] font-black min-w-[28px] text-right", isCompleted ? "text-emerald-600" : "text-muted-foreground")}>
                                {Math.round(progress)}%
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col">
                      {billing.invoices.map((invoice) => {
                        const isLate = new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID';
                        const isPaid = invoice.status === 'PAID';

                        return (
                          <div
                            key={invoice.id}
                            className="flex items-center justify-between p-2.5 px-4 hover:bg-primary/5 transition-colors group/inv border-b border-border/20 last:border-0 cursor-pointer"
                            onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) onEditInvoice(invoice); }}
                          >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {isPaid ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> :
                                   isLate ? <AlertCircle size={15} className="text-rose-500 shrink-0 animate-pulse" /> :
                                   <Circle size={15} className="text-muted-foreground/40 shrink-0" />}

                                  <div className="flex flex-col min-w-0">
                                      <span className={cn("text-[11px] font-semibold truncate", isPaid ? "text-muted-foreground/60 line-through" : "text-foreground")}>
                                          {invoice.title}
                                      </span>
                                      <span className={cn("text-[9px] font-bold flex items-center gap-1", isLate ? "text-rose-600" : "text-muted-foreground/70")}>
                                          <CalendarDays size={10}/> {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                      </span>
                                  </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                  <span className={cn("text-xs font-bold font-mono", isPaid ? "text-muted-foreground/40" : isLate ? "text-rose-600" : "text-foreground/70")}>
                                      {formatCurrency(invoice.value)}
                                  </span>
                                  {!isPaid && (
                                      <div className="flex items-center gap-1 opacity-0 group-hover/inv:opacity-100 transition-opacity">
                                          {client.phone && (
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 text-emerald-600 hover:bg-emerald-50"
                                                title="Enviar no WhatsApp"
                                                onClick={() => onWhatsapp(client.phone!, client.name, billing)}
                                              >
                                                  <Phone size={14} />
                                              </Button>
                                          )}
                                          <Button
                                              variant="ghost"
                                              className="h-7 px-2 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all rounded-lg"
                                              title="Registrar recebimento no Financeiro"
                                              onClick={() => onReceiveInvoice(invoice)}
                                          >
                                              Receber
                                          </Button>
                                      </div>
                                  )}
                              </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
