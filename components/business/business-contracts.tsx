"use client";

import {
  Phone, CheckCircle2, AlertCircle, Briefcase,
  MoreHorizontal, Circle, CalendarDays, Copy, Plus, Trash2, FileDown, Loader2, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { BillingData, ClientData, DeleteTarget, InvoiceData } from "./business-types";

interface ContractsListProps {
  client: ClientData;
  onNewBilling: (clientId: string) => void;
  onEditBilling: (billing: BillingData) => void;
  onEditInvoice: (invoice: InvoiceData) => void;
  onReceiveInvoice: (invoice: InvoiceData) => void;
  onCopyCharge: (clientName: string, billing: BillingData) => void;
  onWhatsapp: (phone: string, clientName: string, billing: BillingData) => void;
  onDeleteTarget: (target: DeleteTarget) => void;
  /** Abre o modal de Nova Parcela para o contrato. */
  onAddInvoice: (billing: { id: string; title: string }) => void;
  /** Gera o PDF da cobrança (contrato + parcelas) para enviar ao cliente. */
  onPdf: (billing: BillingData) => void;
  /** id do contrato com PDF em geração (spinner no botão). */
  pdfBusyId?: string | null;
}

// Lista de Contratos & Projetos (com faturas) de um cliente, usada na página de
// detalhe (/business/[id]). SEM área de rolagem interna: a lista flui na página
// (scroll natural do navegador — nada de conteúdo preso em 60vh).
export function ContractsList({
  client, onNewBilling, onEditBilling, onEditInvoice, onReceiveInvoice,
  onCopyCharge, onWhatsapp, onDeleteTarget, onAddInvoice, onPdf, pdfBusyId,
}: ContractsListProps) {
  const formatCurrency = useFormatCurrency();

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-2">
          <Briefcase size={12} className="text-primary/60" /> Contratos e Projetos
        </span>
        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary rounded-lg" onClick={() => onNewBilling(client.id)}>
          <Plus size={14} className="mr-1" /> Novo
        </Button>
      </div>

      <div className="space-y-4">
          {client.billings.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
              <p className="text-xs font-medium text-muted-foreground">Nenhum contrato ativo.</p>
            </div>
          ) : (
            client.billings.map((billing) => {
              // Faturas canceladas não entram no progresso (senão nunca chega a 100%).
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 opacity-0 group-hover/billing:opacity-100 transition-opacity"
                          onClick={() => onCopyCharge(client.name, billing)}
                          title="Copiar Resumo da Cobrança"
                        >
                          <Copy size={13} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pdfBusyId === billing.id}
                          className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 opacity-0 group-hover/billing:opacity-100 transition-opacity disabled:opacity-100"
                          onClick={() => onPdf(billing)}
                          title="Baixar PDF da cobrança (enviar ao cliente)"
                        >
                          {pdfBusyId === billing.id ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-100 md:opacity-0 md:group-hover/billing:opacity-100 transition-opacity">
                              <MoreHorizontal size={14} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                            <DropdownMenuItem onClick={() => onEditBilling(billing)} className="cursor-pointer font-medium">Ajustar Título/Status</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onAddInvoice({ id: billing.id, title: billing.title })} className="cursor-pointer font-medium">
                              <Plus size={13} className="mr-1.5" /> Nova Parcela
                            </DropdownMenuItem>
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
                    {/* Canceladas ficam ocultas (são "lápides" — inclusive as de
                        cobrança recorrente, que não podem ser apagadas de verdade). */}
                    {relevantInvoices.map((invoice) => {
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
                                <CalendarDays size={10} /> {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={cn("text-xs font-bold font-mono", isPaid ? "text-muted-foreground/40" : isLate ? "text-rose-600" : "text-foreground/70")}>
                              {formatCurrency(invoice.value)}
                            </span>
                            <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/inv:opacity-100 transition-opacity">
                              {invoice.linkUrl && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-primary hover:bg-primary/10"
                                  title="Abrir link de pagamento (boleto/checkout)"
                                  onClick={() => window.open(invoice.linkUrl!.startsWith("http") ? invoice.linkUrl! : `https://${invoice.linkUrl}`, "_blank", "noopener,noreferrer")}
                                >
                                  <ExternalLink size={14} />
                                </Button>
                              )}
                              {!isPaid && client.phone && (
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
                              {!isPaid && (
                                <Button
                                  variant="ghost"
                                  className="h-7 px-2 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all rounded-lg"
                                  title="Registrar recebimento no Financeiro"
                                  onClick={() => onReceiveInvoice(invoice)}
                                >
                                  Receber
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                title={isPaid ? "Excluir fatura (estorna a receita lançada)" : "Excluir fatura"}
                                onClick={() => onDeleteTarget({ type: 'INVOICE', id: invoice.id, name: `${billing.title} · ${invoice.title}` })}
                              >
                                <Trash2 size={13} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {billing.invoices.length > relevantInvoices.length && (
                      <p className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        {billing.invoices.length - relevantInvoices.length} fatura(s) cancelada(s) oculta(s)
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
      </div>
    </div>
  );
}
