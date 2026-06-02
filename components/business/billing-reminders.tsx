"use client";

import { useMemo, useState } from "react";
import { BellRing, ChevronDown, Copy, MessageCircle, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import type { BillingData, ClientData } from "./business-types";

interface BillingRemindersProps {
  clients: ClientData[];
  onCharge: (client: ClientData, billing: BillingData) => void;
  onCopyCharge: (clientName: string, billing: BillingData) => void;
}

interface ReminderItem {
  client: ClientData;
  billing: BillingData;
  openAmount: number;
  nextDue: Date;
  isOverdue: boolean;
  days: number; // dias de atraso (se vencido) ou até vencer
  lastRemindedDays: number | null;
}

const DAY = 1000 * 60 * 60 * 24;
// Janela de antecedência: faturas que vencem nos próximos N dias entram na fila.
const LOOKAHEAD_DAYS = 7;

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

export function BillingReminders({ clients, onCharge, onCopyCharge }: BillingRemindersProps) {
  const formatCurrency = useFormatCurrency();
  const today = startOfDay(new Date());

  const reminders = useMemo<ReminderItem[]>(() => {
    const items: ReminderItem[] = [];

    for (const client of clients) {
      for (const billing of client.billings) {
        if (billing.status === "CANCELED" || billing.status === "COMPLETED") continue;

        const openInvoices = billing.invoices.filter(i => i.status !== "PAID" && i.status !== "CANCELED");
        if (openInvoices.length === 0) continue;

        // Considera o vencimento mais próximo entre as faturas em aberto.
        const nextDue = openInvoices
          .map(i => startOfDay(new Date(i.dueDate)))
          .sort((a, b) => a.getTime() - b.getTime())[0];

        const diffDays = Math.round((nextDue.getTime() - today.getTime()) / DAY);
        // Só entra na fila se está vencida ou vence dentro da janela.
        if (diffDays > LOOKAHEAD_DAYS) continue;

        const openAmount = openInvoices.reduce((s, i) => s + i.value, 0);
        const lastRemindedDays = billing.lastRemindedAt
          ? Math.round((today.getTime() - startOfDay(new Date(billing.lastRemindedAt)).getTime()) / DAY)
          : null;

        items.push({
          client,
          billing,
          openAmount,
          nextDue,
          isOverdue: diffDays < 0,
          days: Math.abs(diffDays),
          lastRemindedDays,
        });
      }
    }

    // Vencidos primeiro (mais atrasados no topo), depois os que vencem mais cedo.
    return items.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.isOverdue) return b.days - a.days;
      return a.days - b.days;
    });
  }, [clients, today]);

  const [open, setOpen] = useState(true);

  const totalOpen = reminders.reduce((s, r) => s + r.openAmount, 0);
  const overdueCount = reminders.filter(r => r.isOverdue).length;

  if (reminders.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Tudo em dia!</p>
          <p className="text-xs text-muted-foreground">Nenhuma fatura vencida ou vencendo nos próximos {LOOKAHEAD_DAYS} dias.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Cabeçalho */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 p-5 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", overdueCount > 0 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600")}>
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm flex items-center gap-2">
              Central de Cobranças
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px]">{reminders.length}</Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {overdueCount > 0 ? `${overdueCount} vencida(s) · ` : ""}{formatCurrency(totalOpen)} em aberto a cobrar
            </p>
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", open && "rotate-180")} />
      </button>

      {/* Lista */}
      {open && (
        <div className="divide-y divide-border/30 border-t border-border/30 max-h-[360px] overflow-y-auto custom-scrollbar">
          {reminders.map(({ client, billing, openAmount, isOverdue, days, lastRemindedDays }) => (
            <div key={billing.id} className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors">
              <Avatar className="h-9 w-9 rounded-xl border border-border/40 shrink-0">
                <AvatarImage src={client.imageUrl || client.friend?.imageUrl || undefined} className="object-cover" />
                <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-sm">
                  {client.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold truncate">{client.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{billing.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {isOverdue ? (
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 border-none text-[10px] gap-1 font-bold">
                      <AlertTriangle size={10} /> Vencida há {days}d
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none text-[10px] gap-1 font-bold">
                      <Clock size={10} /> {days === 0 ? "Vence hoje" : `Vence em ${days}d`}
                    </Badge>
                  )}
                  <span className="text-[11px] font-mono font-bold text-foreground/80">{formatCurrency(openAmount)}</span>
                  {lastRemindedDays !== null && (
                    <span className="text-[9px] text-muted-foreground italic">
                      · cobrado {lastRemindedDays === 0 ? "hoje" : `há ${lastRemindedDays}d`}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-blue-500 hover:bg-blue-500/10"
                  title="Copiar mensagem de cobrança"
                  onClick={() => onCopyCharge(client.name, billing)}
                >
                  <Copy size={14} />
                </Button>
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold disabled:opacity-50"
                  disabled={!client.phone}
                  title={client.phone ? "Cobrar no WhatsApp" : "Cadastre o WhatsApp do cliente"}
                  onClick={() => onCharge(client, billing)}
                >
                  <MessageCircle size={13} /> Cobrar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
