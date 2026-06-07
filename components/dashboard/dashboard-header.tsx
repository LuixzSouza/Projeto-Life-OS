import { Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { QuickActions } from "@/components/dashboard/quick-actions";

interface DashboardHeaderProps {
  greeting: string;
  userName: string;
  productivityScore?: number;
}

export function DashboardHeader({ greeting, userName, productivityScore }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/40">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-foreground">
          {greeting}, <span className="text-primary">{userName}</span>
        </h1>
        <p className="text-muted-foreground flex items-center gap-2 mt-1.5 text-sm">
          <CalendarIcon className="h-4 w-4" />
          <span className="capitalize">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-6">
        {typeof productivityScore === "number" && (
          <>
            <div className="hidden md:flex flex-col items-end">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Score Diário</p>
              <div className="flex items-center gap-2 text-primary font-bold text-2xl leading-none">
                {productivityScore} <TrendingUp className="h-5 w-5 opacity-80" />
              </div>
            </div>
            <div className="h-10 w-px bg-border/50 hidden md:block" />
          </>
        )}
        <QuickActions />
      </div>
    </div>
  );
}
