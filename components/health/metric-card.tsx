import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string; // ex: "vs mês passado"
  };
  colorClass?: string; // Ex: "text-blue-500" e "bg-blue-50"
  isLoading?: boolean;
  onClick?: () => void;
}

export function MetricCard({ 
  title, 
  value, 
  unit, 
  subtitle, 
  icon: Icon, 
  trend, 
  colorClass = "text-zinc-900 dark:text-zinc-100",
  isLoading = false,
  onClick
}: MetricCardProps) {

  // Helper para renderizar a tendência
  const renderTrend = () => {
    if (!trend) return null;

    const trendConfig = {
      up: { icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
      down: { icon: TrendingDown, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20" },
      neutral: { icon: Minus, color: "text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800" },
    };

    const config = trendConfig[trend.direction];
    const TrendIcon = config.icon;

    return (
      <div className="flex items-center gap-2 mt-2">
        <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1", config.color, config.bg)}>
          <TrendIcon className="h-3 w-3" />
          {trend.value}
        </span>
        {trend.label && <span className="text-xs text-muted-foreground">{trend.label}</span>}
      </div>
    );
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "border border-border bg-card shadow-sm transition-all duration-200",
        onClick && "cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md active:scale-[0.98]"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide uppercase text-[10px]">
          {title}
        </CardTitle>
        {/* Ícone com fundo suave baseado na cor passada */}
        <div className={cn("p-2 rounded-full opacity-90", colorClass.replace("text-", "bg-").replace("500", "100"), "dark:bg-opacity-10")}>
           <Icon className={cn("h-4 w-4", colorClass)} />
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold flex items-baseline gap-1 text-foreground">
              {value} 
              {unit && <span className="text-sm font-normal text-muted-foreground">{unit}</span>}
            </div>
            
            {renderTrend()}
            
            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}