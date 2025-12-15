import { Card } from "@/components/ui/card";
import { MarketItem } from "@/lib/market-service";

export function MarketTicker({ data }: { data: MarketItem[] }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {data.map((item) => (
                <Card key={item.ticker} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm p-3">
                    <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-xs text-zinc-500">{item.ticker}</span>
                        <span className={`text-[10px] font-bold ${item.variation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {item.variation >= 0 ? '▲' : '▼'} {Math.abs(item.variation).toFixed(2)}%
                        </span>
                    </div>
                    <div className="text-sm font-black text-zinc-800 dark:text-zinc-100">
                        {item.type === 'INDEX' ? `${item.value}%` : `R$ ${item.value.toLocaleString('pt-BR')}`}
                    </div>
                </Card>
            ))}
        </div>
    );
}