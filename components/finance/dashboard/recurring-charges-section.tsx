"use client";

import { HandCoins, Plus, CalendarClock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { RecurringChargeDialog } from "@/components/finance/recurring-charge-dialog";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useSmartView } from "@/components/finance/smart-view-context";
import { cn } from "@/lib/utils";
import { asFrequency, nextOccurrence, FREQUENCY_LABEL } from "@/lib/recurrence";
import type { DashboardRecurringCharge, DashboardClientOption } from "./types";

interface RecurringChargesSectionProps {
  charges: DashboardRecurringCharge[];
  totalCharges: number;
  clients: DashboardClientOption[];
}

export function RecurringChargesSection({ charges, totalCharges, clients }: RecurringChargesSectionProps) {
  return (
    <section id="cobrancas" className="scroll-mt-36 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-extrabold text-foreground flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl"><HandCoins className="h-5 w-5 text-emerald-600" /></div>
          Cobranças Recorrentes
        </h3>
        <RecurringChargeDialog clients={clients} trigger={
          <Button variant="outline" size="sm" className="gap-2 rounded-xl font-bold shrink-0 hover:border-emerald-500/50 hover:text-emerald-600 transition-all active:scale-95">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nova cobrança</span>
          </Button>
        } />
      </div>

      {charges.length > 0 ? (
        <RecurringChargesCard total={totalCharges} items={charges} clients={clients} />
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border/60 bg-muted/10 transition-colors hover:bg-muted/20">
          <EmptyState
            icon={HandCoins}
            title="Nenhuma cobrança recorrente"
            description="Cadastre o que você recebe todo mês (mensalidades, serviços) para ser lembrado de cobrar na data certa."
            action={
              <RecurringChargeDialog clients={clients} trigger={
                <Button className="rounded-xl h-11 px-8 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                  <Plus className="h-4 w-4 mr-2" /> Criar cobrança
                </Button>
              } />
            }
          />
        </div>
      )}
    </section>
  );
}

function RecurringChargesCard({ total, items, clients }: { total: number; items: DashboardRecurringCharge[]; clients: DashboardClientOption[] }) {
  const { smartView } = useSmartView();
  const formatMoney = useFormatCurrency();

  return (
    <div className="bg-card rounded-[1.5rem] border border-border/40 shadow-sm overflow-hidden transition-all hover:shadow-md">
      {/* Resumo */}
      <div className="p-6 border-b border-border/40 flex justify-between items-start bg-gradient-to-br from-emerald-500/5 to-background">
        <div>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">
            Receita Recorrente Mensal
          </p>
          <h3 className={cn("text-3xl font-black text-emerald-600 tracking-tighter", smartView && "blur-md select-none")}>
            {formatMoney(total)}
          </h3>
          <p className="text-[11px] font-bold text-muted-foreground mt-1">
            ≈ <span className={cn(smartView && "blur-sm select-none")}>{formatMoney(total * 12)}</span> por ano · {items.length} {items.length === 1 ? "cobrança" : "cobranças"}
          </p>
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="max-h-[420px] p-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {items.map((item) => {
            const freq = asFrequency(item.frequency);
            const next = nextOccurrence(item);
            const ended = next === null;
            const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0);
            const days = next ? Math.floor((next.getTime() - todayMid.getTime()) / 86_400_000) : null;
            const dueLabel = ended ? "Encerrada" : days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `em ${days}d`;
            const isSoon = !ended && days !== null && days <= 3;
            const paidTotal = item.installments ? Math.min((item.paidInstallments || 0) + (item.paidCount || 0), item.installments) : 0;

            return (
              <RecurringChargeDialog
                key={item.id}
                item={item}
                clients={clients}
                trigger={
                  <div className={cn("flex items-center justify-between p-3 hover:bg-muted/40 rounded-xl transition-all cursor-pointer group border border-transparent hover:border-border/50", ended && "opacity-60")}>
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                        <HandCoins className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-foreground truncate pr-2 group-hover:text-emerald-600 transition-colors">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-medium">
                          <span className="flex items-center gap-1 text-emerald-600/80">
                            <CalendarClock className="h-3 w-3" /> {item.installments ? `${item.installments}x` : FREQUENCY_LABEL[freq]}
                          </span>
                          {item.installments && (
                            <span className="text-emerald-600/80 font-bold">{paidTotal}/{item.installments} pagas</span>
                          )}
                          {item.clientName && (
                            <span className="flex items-center gap-1 truncate">
                              <User className="h-3 w-3" /> {item.clientName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                      <span className={cn("text-sm font-mono font-black text-foreground tabular-nums", smartView && "blur-sm select-none")}>
                        {formatMoney(item.amount)}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        ended ? "bg-muted text-muted-foreground" : isSoon ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                      )}>
                        {dueLabel}
                      </span>
                    </div>
                  </div>
                }
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
