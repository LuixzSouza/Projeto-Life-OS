"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Wallet, 
  BookOpen, 
  Dumbbell, 
  Briefcase, 
  Calendar, 
  Globe, 
  Settings,
  BrainCircuit
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Visão Geral", icon: LayoutDashboard, href: "/" },
  { label: "Estudos", icon: BookOpen, href: "/studies" },
  { label: "Financeiro", icon: Wallet, href: "/finance" },
  { label: "Saúde", icon: Dumbbell, href: "/health" },
  { label: "Trabalho & Projetos", icon: Briefcase, href: "/projects" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "CMS & Sites", icon: Globe, href: "/cms" },
  { label: "Assistente IA", icon: BrainCircuit, href: "/ai" },
  { label: "Configurações", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-zinc-50/50 dark:bg-zinc-950/50 md:flex">
      {/* Logo / Header da Sidebar */}
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2 font-bold text-xl">
          <div className="h-6 w-6 rounded bg-black dark:bg-white" />
          <span>Life OS</span>
        </div>
      </div>

      {/* Menu de Navegação */}
      <nav className="flex-1 overflow-y-auto py-6 px-3">
        <ul className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900" 
                      : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer da Sidebar (Opcional: Status do Usuário) */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="text-sm">
            <p className="font-medium">Luiz Antônio</p>
            <p className="text-xs text-zinc-500">Admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}