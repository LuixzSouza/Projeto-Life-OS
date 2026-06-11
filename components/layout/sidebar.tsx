"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { PanelLeftClose, PanelLeftOpen, Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

import type { UserData } from "./sidebar-types";
import { groupedSidebarItems, mobileNavItems, isActiveRoute, isItemActive } from "./sidebar-config";
import { SidebarLink } from "./sidebar-link";
import { UserProfileSection } from "./user-profile-section";
import { ConnectionIndicator } from "./connection-indicator";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationInbox } from "@/lib/notifications";

/* -------------------------------------------------------------------------- */
/* Persistência do estado recolhido (localStorage, sem mismatch de hidratação) */
/* -------------------------------------------------------------------------- */
const COLLAPSE_KEY = "lifeos:sidebar:collapsed";
let collapseListeners: Array<() => void> = [];

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COLLAPSE_KEY) === "1";
}
function subscribeCollapsed(cb: () => void) {
  collapseListeners.push(cb);
  return () => { collapseListeners = collapseListeners.filter((l) => l !== cb); };
}
function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const setCollapsed = (v: boolean) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0");
    collapseListeners.forEach((l) => l());
  };
  return [collapsed, setCollapsed];
}

export function Sidebar({ user, inbox }: { user?: UserData | null; inbox: NotificationInbox }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useSidebarCollapsed();
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
          "sticky left-0 top-0 z-50 hidden h-screen shrink-0 flex-col border-r border-border/50 bg-card/40 shadow-sm backdrop-blur-xl transition-[width] duration-300 ease-in-out md:flex",
          isCollapsed ? "w-[76px]" : "w-[264px]"
        )}
      >
        {/* LOGO AREA */}
        <div className={cn("mb-1 flex h-16 items-center border-b border-border/40 px-3", isCollapsed ? "justify-center" : "justify-between")}>
          <Link href="/dashboard" className="flex select-none items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Image width={20} height={20} src="/logo.webp" alt="Logo" className="dark:invert" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-extrabold tracking-tight text-foreground">Life OS</span>
            )}
          </Link>
          {!isCollapsed && (
            <div className="flex items-center gap-0.5">
              <NotificationBell initial={inbox} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(true)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Recolher menu"
              >
                <PanelLeftClose size={18} />
              </Button>
            </div>
          )}
        </div>

        {isCollapsed && (
          <div className="mb-1 flex flex-col items-center gap-1 border-b border-border/40 py-2">
            <NotificationBell initial={inbox} isCollapsed />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              title="Expandir menu"
            >
              <PanelLeftOpen size={18} />
            </Button>
          </div>
        )}

        {/* Busca global (abre a command palette) */}
        <div className="px-3 pt-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            title="Buscar (Ctrl/Cmd+K)"
            className={cn(
              "flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/40 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground",
              isCollapsed ? "justify-center p-2" : "px-3 py-2",
            )}
          >
            <Search className="h-4 w-4 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="text-sm">Buscar…</span>
                <kbd className="ml-auto rounded border border-border/60 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
              </>
            )}
          </button>
        </div>

        <ScrollArea className="flex-1 px-3">
          <div className="space-y-5 py-3 pb-10">
            {groupedSidebarItems.map((group) => (
              <div key={group.groupName} className="space-y-1">
                {!isCollapsed ? (
                  <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                    {group.groupName}
                  </h3>
                ) : (
                  <div className="mx-auto mb-2 h-px w-6 bg-border/60" />
                )}
                {group.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    isCollapsed={isCollapsed}
                    currentPath={pathname}
                  />
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        <ConnectionIndicator isCollapsed={isCollapsed} />
        <UserProfileSection
          user={user}
          isCollapsed={isCollapsed}
          handleLogout={handleLogout}
          isLoggingOut={isLoggingOut}
          initials={initials}
        />
      </aside>

      {/* --- MOBILE MENU (BOTTOM SHEET / APP DRAWER) --- */}
      {/* Em vez do drawer lateral estreito com lista comprida, um bottom sheet
          estilo "gaveta de apps": grade de módulos por grupo + chips de atalho
          para os submódulos. Muito mais rápido de tocar num celular. */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[88dvh] flex-col gap-0 rounded-t-3xl bg-background/95 p-0 backdrop-blur-2xl"
        >
          {/* Alça visual de bottom sheet */}
          <div className="flex justify-center pt-2.5">
            <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
          </div>

          <SheetHeader className="flex-row items-center gap-2.5 space-y-0 px-5 pb-3 pt-1 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Image width={20} height={20} src="/logo.webp" alt="Logo" className="dark:invert" />
            </div>
            <SheetTitle className="mt-0 text-lg font-extrabold">Life OS</SheetTitle>
            {/* mr-10 reserva o canto para o X de fechar do SheetContent */}
            <div className="ml-auto mr-10">
              <NotificationBell initial={inbox} />
            </div>
          </SheetHeader>

          {/* Busca global (abre a command palette) */}
          <div className="border-b border-border/40 px-4 pb-3">
            <button
              type="button"
              onClick={() => {
                setIsSheetOpen(false);
                window.dispatchEvent(new Event("open-command-palette"));
              }}
              className="flex w-full items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5 text-muted-foreground transition-colors active:bg-muted/70"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="text-sm">Buscar em tudo…</span>
            </button>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-6 py-4">
              {groupedSidebarItems.map((group) => {
                const subItems = group.items.flatMap((i) => i.subItems ?? []);
                return (
                  <div key={group.groupName}>
                    <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/50">
                      {group.groupName}
                    </h3>

                    {/* Grade de módulos */}
                    <div className="grid grid-cols-4 gap-2">
                      {group.items.map((item) => {
                        const active = isItemActive(pathname, item);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsSheetOpen(false)}
                            aria-current={isActiveRoute(pathname, item.href) ? "page" : undefined}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-all active:scale-95",
                              active
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-border/40 bg-muted/30 text-muted-foreground"
                            )}
                          >
                            <item.icon className="h-5 w-5" />
                            <span className="w-full truncate text-center text-[10px] font-semibold leading-none">
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Atalhos diretos para submódulos (Treino, Investimentos…) */}
                    {subItems.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {subItems.map((sub) => {
                          const subActive = isActiveRoute(pathname, sub.href);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsSheetOpen(false)}
                              aria-current={subActive ? "page" : undefined}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors active:scale-95",
                                subActive
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-border/40 bg-muted/30 text-muted-foreground"
                              )}
                            >
                              {sub.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <div className="mt-auto pb-safe">
            <ConnectionIndicator />
            <UserProfileSection
              user={user}
              isCollapsed={false}
              handleLogout={handleLogout}
              isLoggingOut={isLoggingOut}
              initials={initials}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* --- MOBILE BOTTOM NAV --- */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.10)] backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-stretch justify-around px-2">
          {mobileNavItems.map((item) => {
            const isActive = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className="flex flex-1 flex-col items-center justify-center gap-0.5 active:scale-95"
              >
                {/* Pílula no ativo (estilo Material 3) em vez do tracinho no topo */}
                <span
                  className={cn(
                    "flex h-7 items-center justify-center rounded-full px-4 transition-all duration-300",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon size={19} />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setIsSheetOpen(true)}
            aria-label="Abrir menu completo"
            className="flex flex-1 flex-col items-center justify-center gap-0.5 text-muted-foreground active:scale-95"
          >
            <span className="flex h-7 items-center justify-center rounded-full px-4">
              <Menu size={19} />
            </span>
            <span className="text-[10px] font-semibold">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
