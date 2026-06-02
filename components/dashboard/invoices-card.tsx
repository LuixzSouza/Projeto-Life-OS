import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Landmark, DollarSign, CalendarDays } from "lucide-react";
import Link from "next/link";
import type { DashboardInvoice } from "@/components/dashboard/types";

interface InvoicesCardProps {
  invoices: DashboardInvoice[];
  today: Date;
  formatCurrency: (val: number) => string;
}

export function InvoicesCard({ invoices, today, formatCurrency }: InvoicesCardProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" /> Faturas a Receber
        </CardTitle>
        <Link href="/business" className="text-xs text-primary hover:underline">Ir para Negócios</Link>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground text-xs border border-dashed border-border/60 rounded-lg bg-muted/10">
            Nenhuma fatura pendente.
          </div>
        ) : (
          <ScrollArea className="h-[200px] pr-4 -mr-4">
            <div className="space-y-1">
              {invoices.map((inv) => {
                const isLate = inv.dueDate < today || inv.status === 'OVERDUE';
                return (
                  <div key={inv.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/40 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden min-w-0">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0", isLate ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary")}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <div className="truncate min-w-0">
                        <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{inv.clientName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{inv.title} • {inv.billingTitle}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="font-mono text-sm font-semibold">{formatCurrency(inv.value)}</span>
                      <span className={cn("text-[9px] flex items-center gap-1", isLate ? "text-red-500 font-bold" : "text-muted-foreground")}>
                        <CalendarDays size={9} /> {inv.dueDate.toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
