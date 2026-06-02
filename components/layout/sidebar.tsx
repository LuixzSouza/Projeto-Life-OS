"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth-actions";
import { PanelLeftClose, PanelLeftOpen, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import Image from "next/image";

import type { UserData } from "./sidebar-types";
import { groupedSidebarItems, mobileNavItems, isActiveRoute } from "./sidebar-config";
import { SidebarLink } from "./sidebar-link";
import { UserProfileSection } from "./user-profile-section";

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

export function Sidebar({ user }: { user?: UserData | null }) {
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Recolher menu"
            >
              <PanelLeftClose size={18} />
            </Button>
          )}
        </div>

        {isCollapsed && (
          <div className="mb-1 flex justify-center border-b border-border/40 py-2">
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
        <SheetContent side="left" className="flex w-[284px] flex-col border-r-border/40 bg-background/95 p-0 backdrop-blur-2xl">
          <SheetHeader className="h-16 flex-row items-center gap-2.5 space-y-0 border-b border-border/50 px-5 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
              <Image width={20} height={20} src="/logo.webp" alt="Logo" className="dark:invert" />
            </div>
            <SheetTitle className="mt-0 text-lg font-extrabold">Life OS</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-3 py-5">
            <div className="space-y-5">
              {groupedSidebarItems.map((group) => (
                <div key={group.groupName} className="space-y-1">
                  <h3 className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                    {group.groupName}
                  </h3>
                  {group.items.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 pb-safe shadow-[0_-8px_30px_rgb(0,0,0,0.10)] backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-stretch justify-around px-2">
          {mobileNavItems.map((item) => {
            const isActive = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex flex-1 flex-col items-center justify-center gap-1 active:scale-95"
              >
                <span
                  className={cn(
                    "absolute top-0 h-0.5 w-9 rounded-full bg-primary transition-all duration-300",
                    isActive ? "opacity-100" : "opacity-0"
                  )}
                />
                <item.icon
                  size={20}
                  className={cn("transition-colors", isActive ? "text-primary" : "text-muted-foreground")}
                />
                <span
                  className={cn(
                    "text-[9px] font-bold uppercase tracking-tighter transition-colors",
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
            className="relative flex flex-1 flex-col items-center justify-center gap-1 text-muted-foreground active:scale-95"
          >
            <Menu size={20} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
