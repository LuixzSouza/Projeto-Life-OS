"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { 
  LayoutDashboard, Wallet, BookOpen, Dumbbell, Briefcase, Calendar, 
  Globe, Settings, BrainCircuit, LogOut, Lock, Zap, Battery, BatteryLow, 
  PanelLeftClose, PanelLeftOpen, ChevronRight, Bookmark, Film, Users, 
  Shirt, Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useThemeColor } from "@/components/providers/theme-color-provider"; // ✅ Importando o contexto

const sidebarItems = [
  { label: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "Assistente IA", icon: BrainCircuit, href: "/ai" },
  { label: "Projetos", icon: Briefcase, href: "/projects" },
  { label: "Financeiro", icon: Wallet, href: "/finance" },
  { label: "Saúde", icon: Dumbbell, href: "/health" },
  { label: "Estudos", icon: BookOpen, href: "/studies" },
  { label: "Entretenimento", icon: Film, href: "/entertainment" }, 
  { label: "Sites & CMS", icon: Globe, href: "/cms" },
  { label: "Links & Apps", icon: Bookmark, href: "/links" }, 
  { label: "Acessos", icon: Lock, href: "/access" },
  { label: "Conexões", icon: Users, href: "/social" },
  { label: "Closet", icon: Shirt, href: "/wardrobe" },
  { label: "Configurações", icon: Settings, href: "/settings" },
  { label: "Setup", icon: Settings, href: "/setup" },
];

interface SidebarProps {
  user?: {
    name: string;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { themeColor } = useThemeColor(); // ✅ Hooks para cor dinâmica se precisar de lógica extra
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("high");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const toggleEnergy = () => {
    const levels: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
    const nextIndex = (levels.indexOf(energyLevel) + 1) % levels.length;
    setEnergyLevel(levels[nextIndex]);
  };

  const getEnergyIcon = () => {
    switch(energyLevel) {
      case "high": return { icon: Zap, color: "text-yellow-500", label: "Modo Turbo" };
      case "medium": return { icon: Battery, color: "text-emerald-500", label: "Estável" };
      case "low": return { icon: BatteryLow, color: "text-rose-500", label: "Recarregar" };
    }
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    toast.info("Desconectando..."); 

    try {
      await signOut(); 
    } catch (error) {
      toast.error("Erro ao sair.");
      setIsLoggingOut(false);
    }
  };

  const EnergyStatus = getEnergyIcon();
  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  return (
    <aside 
      className={cn(
        "hidden h-screen flex-col border-r border-zinc-200/50 dark:border-zinc-800/50 bg-background/95 backdrop-blur-xl md:flex sticky top-0 left-0 shrink-0 z-50 shadow-sm transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[80px]" : "w-[280px]"
      )}
    >
      
      {/* 1. Header */}
      <div className={cn("flex h-16 items-center border-b border-border/50", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-foreground select-none overflow-hidden whitespace-nowrap">
            {/* ✅ Logo agora usa a cor primária dinâmica */}
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
              <span className="font-mono text-base font-bold">L</span>
            </div>
            <span className="font-alt tracking-tight text-lg">Life OS</span>
          </div>
        )}

        {isCollapsed && (
             <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <span className="font-mono text-base font-bold">L</span>
             </div>
        )}
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("text-muted-foreground hover:text-foreground", isCollapsed && "hidden")}
        >
          {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>

      {isCollapsed && (
          <div className="w-full flex justify-center py-2 border-b border-border/50">
             <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)}>
                 <ChevronRight className="h-5 w-5 text-muted-foreground" />
             </Button>
          </div>
      )}

      {/* 2. Menu de Navegação */}
      <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            
            const LinkContent = (
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg py-2.5 transition-all duration-200 relative",
                  isCollapsed ? "justify-center px-0" : "px-3",
                  isActive 
                    ? "bg-secondary text-primary font-semibold" // ✅ Mudado para usar variáveis semânticas
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "transition-colors",
                  isCollapsed ? "h-6 w-6" : "h-5 w-5",
                  // ✅ Ícone agora herda a cor primária (Azul, Verde, Roxo...)
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                
                {!isCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
                
                {isActive && (
                  <div className={cn(
                    "absolute rounded-full bg-primary", // ✅ Indicador agora usa a cor primária
                    isCollapsed ? "left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-lg" : "right-3 w-1.5 h-1.5"
                  )}></div>
                )}
              </Link>
            );

            if (isCollapsed) {
                return (
                    <TooltipProvider key={item.href} delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>{LinkContent}</TooltipTrigger>
                            <TooltipContent side="right" className="font-medium bg-foreground text-background border-0">
                                {item.label}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )
            }

            return <div key={item.href}>{LinkContent}</div>;
          })}
        </nav>
      </div>

      {/* 3. Footer do Usuário */}
      <div className="p-4 border-t border-border/50 bg-muted/20">
        <Link href="/settings">
            <div className={cn(
                "relative group flex items-center rounded-xl hover:bg-background border border-transparent hover:border-border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md",
                isCollapsed ? "justify-center p-2" : "gap-3 p-2"
            )}>
            <Avatar className={cn("border border-border transition-transform group-hover:scale-105", isCollapsed ? "h-9 w-9" : "h-9 w-9")}>
                <AvatarImage src={user?.avatarUrl || ""} className="object-cover" />
                <AvatarFallback className="bg-secondary font-bold text-xs text-muted-foreground">
                    {initials}
                </AvatarFallback>
            </Avatar>
            
            {!isCollapsed && (
                <div className="flex flex-col truncate flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground truncate leading-tight">
                        {user?.name || "Usuário"}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-1 -ml-1 transition-colors" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEnergy(); }}>
                            <EnergyStatus.icon className={cn("h-3 w-3", EnergyStatus.color)} />
                            <span className="text-[10px] text-muted-foreground">Estado</span>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </Link>
        
        <div className={cn("mt-2 flex", isCollapsed ? "justify-center" : "justify-center")}>
             <TooltipProvider>
                <Tooltip delayDuration={500}>
                    <TooltipTrigger asChild>
                        <button 
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            className={cn(
                                "text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center w-full justify-center hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg",
                                isCollapsed ? "p-2" : "gap-1.5 text-[10px] py-2"
                            )}
                        >
                            {isLoggingOut ? <Loader2 className="animate-spin h-3 w-3" /> : <LogOut className={cn("transition-transform group-hover:-translate-x-1", isCollapsed ? "h-5 w-5" : "h-3 w-3")} />}
                            {!isCollapsed && (isLoggingOut ? "Saindo..." : "Encerrar Sessão")}
                        </button>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">Sair do Sistema</TooltipContent>}
                </Tooltip>
             </TooltipProvider>
        </div>
      </div>
    </aside>
  );
}