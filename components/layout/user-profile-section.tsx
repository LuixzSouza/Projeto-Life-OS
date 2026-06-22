"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import type { UserData } from "./sidebar-types";

export const UserProfileSection = ({
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
            aria-label="Sair"
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
          aria-label="Sair"
          onClick={handleLogout}
          className="h-9 w-9 mx-auto flex mt-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut size={18} />
        </Button>
      )}
    </div>
  );
};
