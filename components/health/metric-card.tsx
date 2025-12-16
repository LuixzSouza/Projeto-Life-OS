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
  // Opcional: Permite sobrescrever a cor padrão (primary) se necessário, 
  // mas o padrão agora é automático via CSS Variables.
  iconClassName?: string; 
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
  iconClassName,
  isLoading = false,
  onClick
}: MetricCardProps) {

  // Configuração visual das tendências
  const renderTrend = () => {
    if (!trend) return null;

    const trendConfig = {
      up: { 
        icon: TrendingUp, 
        style: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
      },
      down: { 
        icon: TrendingDown, 
        style: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" 
      },
      neutral: { 
        icon: Minus, 
        style: "text-muted-foreground bg-muted border-transparent" 
      },
    };

    const config = trendConfig[trend.direction];
    const TrendIcon = config.icon;

    return (
      <div className="flex items-center gap-2 mt-3">
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
          config.style
        )}>
          <TrendIcon className="h-3 w-3" />
          {trend.value}
        </span>
        {trend.label && (
          <span className="text-xs text-muted-foreground font-medium truncate">
            {trend.label}
          </span>
        )}
      </div>
    );
  };

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden border-border/60 bg-card transition-all duration-300",
        // Efeitos de Hover Premium
        "hover:shadow-md hover:border-primary/30",
        onClick && "cursor-pointer active:scale-[0.99]"
      )}
    >
      {/* Gradiente de Fundo Sutil no Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        
        {/* Container do Ícone Moderno */}
        <div className={cn(
          "p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110",
          "bg-primary/10 text-primary ring-1 ring-primary/20",
          iconClassName // Permite override se necessário, mas o padrão é primary
        )}>
           <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        {isLoading ? (
          <div className="space-y-3 mt-1">
            <Skeleton className="h-8 w-24 rounded-lg bg-muted/50" />
            <Skeleton className="h-4 w-32 rounded-lg bg-muted/50" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-3xl font-bold tracking-tight text-foreground">
                {value}
              </span>
              {unit && (
                <span className="text-sm font-medium text-muted-foreground/80">
                  {unit}
                </span>
              )}
            </div>
            
            {renderTrend()}
            
            {subtitle && !trend && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {subtitle}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}