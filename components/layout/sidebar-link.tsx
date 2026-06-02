"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { isActiveRoute, isItemActive } from "./sidebar-config";
import type { SidebarItem } from "./sidebar-types";

export const SidebarLink = ({
  item,
  isCollapsed,
  currentPath,
  onClick,
}: {
  item: SidebarItem;
  isCollapsed?: boolean;
  currentPath: string;
  onClick?: () => void;
}) => {
  const hasSubItems = !!item.subItems?.length;

  // Ativo "self" = a própria rota; ativo "geral" = self ou algum sub-item.
  const selfActive = isActiveRoute(currentPath, item.href);
  const active = isItemActive(currentPath, item);

  const [isOpen, setIsOpen] = useState(() => active);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen((v) => !v);
  };

  const content = (
    <div className="w-full">
      {/* ROW */}
      <div className="flex items-center gap-1">
        <Link
          href={item.href}
          onClick={onClick}
          aria-current={selfActive ? "page" : undefined}
          className={cn(
            "group relative flex flex-1 items-center gap-3 rounded-lg py-2 text-sm transition-all duration-200",
            isCollapsed ? "mx-auto h-10 w-10 justify-center px-0" : "h-10 px-3",
            active
              ? "bg-primary/10 font-semibold text-primary"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
          )}
        >
          {/* Indicador lateral (expandido) */}
          {active && !isCollapsed && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
          )}

          <item.icon
            className={cn(
              "shrink-0 transition-transform group-hover:scale-110",
              isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]",
              active && "text-primary"
            )}
          />

          {!isCollapsed && <span className="flex-1 truncate">{item.label}</span>}

          {/* Pontinho de status no modo recolhido */}
          {active && isCollapsed && (
            <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </Link>

        {/* SETA DO SUBMENU */}
        {!isCollapsed && hasSubItems && (
          <button
            onClick={toggle}
            aria-label="Expandir submenu"
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-secondary hover:text-foreground",
              isOpen && "rotate-180"
            )}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* SUBMENU */}
      {!isCollapsed && hasSubItems && isOpen && (
        <div className="mt-1 ml-[26px] flex flex-col gap-0.5 border-l border-border/50 pl-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {item.subItems!.map((sub) => {
            const isSubActive = isActiveRoute(currentPath, sub.href);
            return (
              <Link
                key={sub.href}
                href={sub.href}
                onClick={onClick}
                aria-current={isSubActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  isSubActive
                    ? "font-semibold text-primary"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                    isSubActive ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
                <span className="truncate">{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};
