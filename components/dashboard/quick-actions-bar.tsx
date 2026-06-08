// src/components/dashboard/quick-actions-bar.tsx
import Link from "next/link";
import { PlusCircle, Receipt, CheckSquare, FolderPlus, CalendarPlus } from "lucide-react";

export function QuickActionsBar() {
  const actions = [
    {
      title: "Nova Transação",
      icon: Receipt,
      href: "/finance/transactions",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      hover: "hover:bg-emerald-500/20"
    },
    {
      title: "Nova Tarefa",
      icon: CheckSquare,
      href: "/projects",
      color: "text-indigo-500",
      bg: "bg-indigo-500/10",
      hover: "hover:bg-indigo-500/20"
    },
    {
      title: "Novo Projeto",
      icon: FolderPlus,
      href: "/projects",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      hover: "hover:bg-purple-500/20"
    },
    {
      title: "Novo Evento",
      icon: CalendarPlus,
      href: "/agenda",
      color: "text-rose-500",
      bg: "bg-rose-500/10",
      hover: "hover:bg-rose-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-3 md:flex md:flex-wrap md:gap-4">
      {actions.map((action, index) => {
        const Icon = action.icon;

        return (
          <Link
            key={index}
            href={action.href}
            className={`flex flex-1 items-center gap-3 rounded-xl border border-border/50 bg-card p-3 shadow-sm transition-all hover:shadow-md sm:p-4 ${action.hover}`}
          >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${action.bg}`}>
              <Icon className={`h-5 w-5 ${action.color}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {action.title}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <PlusCircle className="h-3 w-3 shrink-0" /> Adicionar
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}