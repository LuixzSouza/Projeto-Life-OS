"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import {
  LayoutDashboard, Wallet, BookOpen, Dumbbell, Briefcase, Calendar,
  Globe, Settings, BrainCircuit, LogOut, Lock, Zap, Battery, BatteryLow,
  PanelLeftClose, PanelLeftOpen, ChevronRight, Bookmark, Film, Users,
  Shirt, Loader2, Menu, X, Home
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetClose, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// --- TIPOS ---
interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

// --- DADOS ---
const sidebarItems: SidebarItem[] = [
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
];

const mobileNavItems = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "IA", icon: BrainCircuit, href: "/ai" },
  { label: "Config", icon: Settings, href: "/settings" },
  { label: "Menu", icon: Menu, href: "#" }, // Aciona o Sheet
];

// --- SUB-COMPONENTES (Definidos FORA do componente principal) ---

// 1. Link da Sidebar (Reutilizável)
const SidebarLink = ({ item, isCollapsed, isActive, onClick }: { item: SidebarItem, isCollapsed?: boolean, isActive: boolean, onClick?: () => void }) => {
  const LinkContent = (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-lg py-2.5 transition-all duration-200 relative",
        isCollapsed ? "justify-center px-0" : "px-3",
        isActive
          ? "bg-secondary text-primary font-semibold"
          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      )}
    >
      <item.icon className={cn(
        "transition-colors",
        isCollapsed ? "h-6 w-6" : "h-5 w-5",
        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )} />

      {!isCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}

      {isActive && (
        <div className={cn(
          "absolute rounded-full bg-primary",
          isCollapsed ? "left-1 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-lg" : "right-3 w-1.5 h-1.5"
        )}></div>
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{LinkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium bg-foreground text-background border-0">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return LinkContent;
};

// 2. Perfil do Usuário e Logout
interface UserProfileSectionProps {
  user: { name?: string; avatarUrl?: string | null } | null | undefined;
  isCollapsed: boolean;
  energyLevel: "high" | "medium" | "low";
  toggleEnergy: () => void;
  getEnergyIcon: () => { icon: React.ComponentType<{ className?: string }>; color: string; label: string };
  handleLogout: (e: React.MouseEvent) => Promise<void>;
  isLoggingOut: boolean;
  initials: string;
}

const UserProfileSection = ({ 
  user, isCollapsed, energyLevel, toggleEnergy, getEnergyIcon, handleLogout, isLoggingOut, initials 
}: UserProfileSectionProps) => {
  const EnergyStatus = getEnergyIcon();

  return (
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
                <div 
                  className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-1 -ml-1 transition-colors" 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleEnergy(); }}
                >
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
  );
};

// --- COMPONENTE PRINCIPAL ---

interface SidebarProps {
  user?: {
    name: string;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<"high" | "medium" | "low">("high");
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const toggleEnergy = () => {
    const levels: ("high" | "medium" | "low")[] = ["high", "medium", "low"];
    const nextIndex = (levels.indexOf(energyLevel) + 1) % levels.length;
    setEnergyLevel(levels[nextIndex]);
  };

  const getEnergyIcon = () => {
    switch (energyLevel) {
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
    setIsSheetOpen(false);

    try {
      await signOut();
    } catch (error) {
      toast.error("Erro ao sair.");
      setIsLoggingOut(false);
    }
  };

  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  // Agrupando props para passar para os componentes filhos
  const userProps = {
    user, isCollapsed, energyLevel, toggleEnergy, getEnergyIcon, handleLogout, isLoggingOut, initials
  };

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          "hidden h-screen flex-col border-r border-zinc-200/50 dark:border-zinc-800/50 bg-background/95 backdrop-blur-xl md:flex sticky top-0 left-0 shrink-0 z-50 shadow-sm transition-all duration-300 ease-in-out",
          isCollapsed ? "w-[80px]" : "w-[280px]"
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-border/50", isCollapsed ? "justify-center px-0" : "justify-between px-6")}>
          {!isCollapsed && (
            <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-foreground select-none overflow-hidden whitespace-nowrap">
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

        <div className="flex-1 overflow-y-auto py-6 px-3 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                isCollapsed={isCollapsed}
                isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
              />
            ))}
          </nav>
        </div>

        <UserProfileSection {...userProps} />
      </aside>

      {/* --- MOBILE SHEET (MENU LATERAL) --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-[280px] sm:w-[300px] p-0 overflow-y-auto">
          {/* CORREÇÃO ERRO 1: SheetHeader com SheetTitle oculto para acessibilidade */}
          <SheetHeader className="h-16 flex items-center justify-between border-b border-border/50 px-6 flex-row">
            <SheetTitle className="sr-only">Menu de Navegação</SheetTitle> {/* sr-only esconde visualmente mas mantém para leitores de tela */}
            
            <div className="flex items-center gap-3 font-bold text-xl tracking-tight text-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                <span className="font-mono text-base font-bold">L</span>
              </div>
              <span className="font-alt tracking-tight text-lg">Life OS</span>
            </div>
            
            {/* Botão fechar customizado ou nativo do SheetClose */}
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-6 px-3">
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  isCollapsed={false}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onClick={() => setIsSheetOpen(false)}
                />
              ))}
            </nav>
          </div>

          <UserProfileSection {...userProps} isCollapsed={false} />
        </SheetContent>
      </Sheet>

      {/* --- MOBILE BOTTOM NAV --- */}
      <div className="md:hidden h-16" /> {/* Espaçador */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/50 py-2 px-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between">
          {mobileNavItems.map((item) => {
            const isActive = item.href !== "#" && (pathname === item.href || pathname.startsWith(`${item.href}/`));

            if (item.label === "Menu") {
              return (
                <button
                  key={item.label}
                  onClick={() => setIsSheetOpen(!isSheetOpen)}
                  className={cn(
                    "flex flex-col items-center justify-center h-14 w-14 rounded-2xl transition-all active:scale-95",
                    isSheetOpen 
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isSheetOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  <span className="text-[9px] mt-1 font-medium">Menu</span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center h-14 w-14 rounded-xl transition-all active:scale-95",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
                onClick={() => setIsSheetOpen(false)}
              >
                <item.icon className={cn("h-5 w-5", isActive && "fill-current")} />
                <span className="text-[9px] mt-1 font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}