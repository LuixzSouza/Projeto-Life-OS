"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import {
  LayoutDashboard, Wallet, BookOpen, Dumbbell, Briefcase, Calendar,
  Globe, Settings, BrainCircuit, LogOut, Lock, PanelLeftClose, 
  ChevronRight, Bookmark, Film, Users, Shirt, Loader2, Menu, Home, 
  BriefcaseBusiness, ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

// --- INTERFACES ---
interface UserData {
  name: string;
  avatarUrl?: string | null;
  bio?: string | null;
}

interface SubItem {
  label: string;
  href: string;
}

interface SidebarItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  subItems?: SubItem[];
}

interface SidebarGroup {
  groupName: string;
  items: SidebarItem[];
}

// --- DADOS ORGANIZADOS COM SUB-LINKS ---
const groupedSidebarItems: SidebarGroup[] = [
  {
    groupName: "Central",
    items: [
      { label: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Agenda", icon: Calendar, href: "/agenda" },
      { label: "Assistente IA", icon: BrainCircuit, href: "/ai" },
    ]
  },
  {
    groupName: "Profissional",
    items: [
      { label: "Projetos", icon: Briefcase, href: "/projects" },
      { label: "Negócios", icon: BriefcaseBusiness, href: "/business" },
      { label: "Financeiro", icon: Wallet, href: "/finance", subItems: [{ label: "Investmentos", href: "/finance/investments" },{ label: "Mercado Financeiro", href: "/finance/market" },{ label: "Transações", href: "/finance/transactions" },] },
    ]
  },
  {
    groupName: "Pessoal",
    items: [
      { 
        label: "Saúde", 
        icon: Dumbbell, 
        href: "/health",
        subItems: [
          { label: "Treino", href: "/health/gym" },
          { label: "Corrida", href: "/health/running" },
          { label: "Nutrição", href: "/health/nutrition" },
          { label: "Sono", href: "/health/sleep" },
          { label: "Corpo", href: "/health/body" },
        ]
      },
      { label: "Estudos", icon: BookOpen, href: "/studies", subItems: [{ label: "Flash Cards", href: "/flashcards" }] },
      { label: "Entretenimento", icon: Film, href: "/entertainment" },
      { label: "Closet", icon: Shirt, href: "/wardrobe" },
      { label: "Conexões", icon: Users, href: "/social" },
    ]
  },
  {
    groupName: "Sistema",
    items: [
      { label: "Sites & CMS", icon: Globe, href: "/cms" },
      { label: "Links & Apps", icon: Bookmark, href: "/links" },
      { label: "Acessos", icon: Lock, href: "/access" },
      { label: "Configurações", icon: Settings, href: "/settings" },
    ]
  }
];

const mobileNavItems = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "IA", icon: BrainCircuit, href: "/ai" },
  { label: "Config", icon: Settings, href: "/settings" },
];

// --- SUB-COMPONENTES ---

const SidebarLink = ({
  item,
  isCollapsed,
  isActive,
  currentPath,
  onClick
}: {
  item: SidebarItem
  isCollapsed?: boolean
  isActive: boolean
  currentPath: string
  onClick?: () => void
}) => {

  const hasSubItems = !!item.subItems?.length
  const [isOpen, setIsOpen] = useState(() => currentPath.startsWith(item.href))

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen((v) => !v)
  }

  const content = (
    <div className="w-full">

      {/* ROW */}
      <div className="flex items-center gap-1">

        {/* LINK PRINCIPAL */}
        <Link
          href={item.href}
          onClick={onClick}
          className={cn(
            "group flex flex-1 items-center gap-3 rounded-lg py-2 transition-all duration-200",
            isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-3 h-10",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          )}
        >
          <item.icon
            className={cn(
              "shrink-0 transition-transform group-hover:scale-110",
              isCollapsed ? "h-5 w-5" : "h-4 w-4"
            )}
          />

          {!isCollapsed && (
            <span className="text-sm truncate flex-1">
              {item.label}
            </span>
          )}
        </Link>

        {/* BOTÃO DA SETA */}
        {!isCollapsed && hasSubItems && (
          <button
            onClick={toggle}
            className={cn(
              "p-2 rounded-md hover:bg-secondary transition-transform",
              isOpen && "rotate-180"
            )}
          >
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        )}

      </div>

      {/* SUBMENU */}
      {!isCollapsed && hasSubItems && isOpen && (
        <div className="mt-1 ml-6 pl-4 border-l border-border/40 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {item.subItems!.map((sub) => {

            const isSubActive = currentPath === sub.href

            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onClick}
                className={cn(
                  "block py-1.5 text-xs transition-colors rounded-md px-2",
                  isSubActive
                    ? "text-primary font-bold bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {sub.label}
              </Link>
            )
          })}
        </div>
      )}

    </div>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

const UserProfileSection = ({ 
  user, 
  isCollapsed, 
  handleLogout, 
  isLoggingOut, 
  initials 
}: {
  user?: UserData | null;
  isCollapsed: boolean;
  handleLogout: (e: React.MouseEvent) => Promise<void>;
  isLoggingOut: boolean;
  initials: string;
}) => {
  return (
    <div className="mt-auto p-4 border-t border-border/50 bg-muted/5">
      <div className={cn(
        "flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-secondary/50 group relative",
        isCollapsed && "justify-center"
      )}>
        <Avatar className="h-9 w-9 border border-border/50 shadow-sm">
          <AvatarImage src={user?.avatarUrl || ""} className="object-cover" />
          <AvatarFallback className="text-xs bg-secondary font-bold text-muted-foreground">{initials}</AvatarFallback>
        </Avatar>

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-foreground leading-tight">
              {user?.name || "Usuário"}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground truncate uppercase tracking-widest mt-0.5">
              {user?.bio || "Administrador"}
            </p>
          </div>
        )}

        {!isCollapsed && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          </Button>
        )}
      </div>
      
      {isCollapsed && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLogout}
          className="h-9 w-9 mx-auto flex mt-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut size={18} />
        </Button>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---

export function Sidebar({ user }: { user?: UserData | null }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    toast.info("Encerrando sessão...");
    try {
      await signOut();
    } catch (error) {
      if ((error as Error).message !== "NEXT_REDIRECT") {
        toast.error("Erro ao sair.");
        setIsLoggingOut(false);
      }
    }
  };

  const initials = user?.name ? user.name.substring(0, 2).toUpperCase() : "US";

  return (
    <>
      {/* --- DESKTOP SIDEBAR --- */}
      <aside
        className={cn(
          "hidden h-screen flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl md:flex sticky top-0 left-0 shrink-0 z-50 transition-all duration-300 ease-in-out shadow-sm",
          isCollapsed ? "w-[80px]" : "w-[260px]"
        )}
      >
        {/* LOGO AREA */}
        <div className={cn("flex h-16 items-center px-4 mb-2 border-b border-border/40", isCollapsed ? "justify-center" : "justify-between")}>
          <div className="flex items-center gap-3 overflow-hidden select-none">
            <div className="shrink-0 flex items-center justify-center">
               <Image width={28} height={28} src="/logo.webp" alt="Logo" className="dark:invert" />
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-lg tracking-tight text-foreground">
                Life OS
              </span>
            )}
          </div>
          {!isCollapsed && (
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(true)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <PanelLeftClose size={18} />
            </Button>
          )}
        </div>

        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-border/40 mb-2">
             <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(false)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground">
                <ChevronRight size={16} />
             </Button>
          </div>
        )}

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-6 py-4 pb-10">
            {groupedSidebarItems.map((group) => (
              <div key={group.groupName} className="space-y-1">
                {!isCollapsed && (
                  <h3 className="px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50 mb-2">
                    {group.groupName}
                  </h3>
                )}
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    isCollapsed={isCollapsed}
                    isActive={pathname === item.href}
                    currentPath={pathname}
                  />
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        <UserProfileSection 
          user={user}
          isCollapsed={isCollapsed}
          handleLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          initials={initials}
        />
      </aside>

      {/* --- MOBILE MENU (SHEET) --- */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="left" className="w-[280px] p-0 border-r-border/40 bg-background/95 backdrop-blur-2xl flex flex-col">
          <SheetHeader className="h-16 px-6 border-b border-border/50 flex-row items-center gap-3 space-y-0 text-left">
             <Image width={24} height={24} src="/logo.webp" alt="Logo" className="dark:invert" />
             <SheetTitle className="text-lg font-extrabold mt-0">Life OS</SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="flex-1 px-3 py-6">
             <div className="space-y-6">
                {groupedSidebarItems.map((group) => (
                  <div key={group.groupName} className="space-y-1">
                    <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2">
                      {group.groupName}
                    </h3>
                    {group.items.map((item) => (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        isActive={pathname === item.href}
                        currentPath={pathname}
                        onClick={() => setIsSheetOpen(false)}
                      />
                    ))}
                  </div>
                ))}
             </div>
          </ScrollArea>

          <UserProfileSection 
            user={user}
            isCollapsed={false}
            handleLogout={handleLogout}
            isLoggingOut={isLoggingOut}
            initials={initials}
          />
        </SheetContent>
      </Sheet>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
        <div className="flex items-center justify-around h-16 px-4">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.label} 
                href={item.href} 
                className={cn(
                  "flex flex-col items-center gap-1 transition-all duration-300 active:scale-90",
                  isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon size={20} className={cn(isActive && "fill-current")} />
                <span className="text-[9px] font-bold uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
          <button 
            onClick={() => setIsSheetOpen(true)} 
            className="flex flex-col items-center gap-1 text-muted-foreground active:scale-90"
          >
            <Menu size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}