import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { DashboardTransaction } from "@/components/dashboard/types";

interface TransactionsCardProps {
  transactions: DashboardTransaction[];
}

export function TransactionsCard({ transactions }: TransactionsCardProps) {
  return (
    <Card className="shadow-sm border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" /> Movimentações
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] pr-4 -mr-4">
          <div className="space-y-1">
            {transactions.map(t => (
              <div key={t.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/40 transition-colors group">
                <div className="flex items-center gap-3 overflow-hidden min-w-0">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                    {t.type === 'INCOME' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  </div>
                  <div className="truncate min-w-0">
                    <p className="font-medium text-sm truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{t.account.name} • {new Date(t.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-mono text-xs font-medium whitespace-nowrap shrink-0 pl-2 ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-foreground'}`}>
                  {t.type === 'INCOME' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
