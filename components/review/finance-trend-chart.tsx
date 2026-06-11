"use client";

// Tendência financeira da Retrospectiva: 12 meses de receita × despesa (barras)
// com a linha do saldo por cima. Clicar num mês navega a página para ele.

import { useRouter } from "next/navigation";
import { Bar, ComposedChart, Line, Tooltip, XAxis, ReferenceLine } from "recharts";
import { ChartContainer } from "@/components/ui/chart-container";
import { useFormatCurrency } from "@/components/providers/currency-provider";

export interface TrendPoint {
  label: string;    // "jan", "fev"…
  monthKey: string; // "2026-01" → /review?month=
  income: number;
  expense: number;
  balance: number;
  isCurrent: boolean; // mês em exibição na página
}

interface TooltipPayloadEntry {
  payload: TrendPoint;
}

function TrendTooltip({
  active, payload, fmt,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  fmt: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md space-y-0.5">
      <p className="font-bold capitalize">{p.label} · {p.monthKey.slice(0, 4)}</p>
      <p className="text-emerald-500">Receitas: {fmt(p.income)}</p>
      <p className="text-rose-500">Despesas: {fmt(p.expense)}</p>
      <p className={p.balance >= 0 ? "text-foreground" : "text-rose-500"}>
        Saldo: {fmt(p.balance)}
      </p>
      <p className="pt-0.5 text-[10px] text-muted-foreground">Clique para abrir o mês</p>
    </div>
  );
}

export function FinanceTrendChart({ data }: { data: TrendPoint[] }) {
  const router = useRouter();
  const fmt = useFormatCurrency();

  const goToMonth = (point?: TrendPoint) => {
    if (point && !point.isCurrent) router.push(`/review?month=${point.monthKey}`);
  };

  return (
    <div className="h-[220px] w-full">
      <ChartContainer>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
          onClick={(state) => {
            // O tipo do handler não expõe activeTooltipIndex em todas as versões
            // do recharts — cast estrutural estreito (sem any).
            const idx = (state as { activeTooltipIndex?: number } | null)?.activeTooltipIndex;
            if (typeof idx === "number") goToMonth(data[idx]);
          }}
          className="cursor-pointer"
        >
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            dy={6}
            interval={0}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted)/0.25)" }}
            content={(props) => (
              <TrendTooltip active={props.active} payload={props.payload as TooltipPayloadEntry[] | undefined} fmt={fmt} />
            )}
          />
          <ReferenceLine y={0} stroke="hsl(var(--border))" />
          <Bar dataKey="income" name="Receitas" radius={[3, 3, 0, 0]} barSize={9} fill="#10b981" fillOpacity={0.85} />
          <Bar dataKey="expense" name="Despesas" radius={[3, 3, 0, 0]} barSize={9} fill="#f43f5e" fillOpacity={0.75} />
          <Line
            dataKey="balance"
            name="Saldo"
            type="monotone"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
