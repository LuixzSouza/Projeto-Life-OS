"use client";

import { BriefcaseBusiness, Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { Pill } from "./bento-atoms";

// models Client / Billing / Invoice (status PENDING/PAID/OVERDUE).
interface Inv {
  title: string;
  client: string;
  status: string;
  icon: LucideIcon;
}

const INVOICES: Inv[] = [
  { title: "Parcela 2/3", client: "Studio Aurora", status: "Pago", icon: CheckCircle2 },
  { title: "Mensalidade Jun", client: "Café Norte", status: "Pendente", icon: Clock },
  { title: "Parcela 1/2", client: "Loja Vibe", status: "Vencido", icon: AlertCircle },
];

export function BusinessCard() {
  return (
    <BaseCard
      title="Negócios"
      icon={BriefcaseBusiness}
      description="Clientes, contratos e faturas."
      className="col-span-1 min-h-[260px]"
    >
      <div className="flex h-full w-full flex-col p-4">
        {/* Recebido no mês + clientes */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="flex items-end gap-1">
              <span className="text-sm text-muted-foreground">R$</span>
              <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                9.450
              </span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Recebido em junho
            </span>
          </div>
          <Pill icon={Users}>8 clientes</Pill>
        </div>

        {/* Faturas */}
        <div className="flex flex-1 flex-col gap-2">
          {INVOICES.map((inv) => {
            const Icon = inv.icon;
            return (
              <div
                key={inv.title}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 transition-colors hover:border-primary/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{inv.title}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{inv.client}</p>
                </div>
                <Pill icon={Icon} muted={inv.status !== "Pago"}>
                  {inv.status}
                </Pill>
              </div>
            );
          })}
        </div>

        {/* Cobrança via PIX */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2">
          <BriefcaseBusiness className="size-4 shrink-0 text-primary" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">Central de cobrança</span> com PIX e
            lembretes.
          </p>
        </div>
      </div>
    </BaseCard>
  );
}
