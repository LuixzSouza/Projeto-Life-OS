"use client";

import { AccessItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Copy, Eye, EyeOff, Key, Loader2, Check, User, LockOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccessCredentialFieldsProps {
  item: AccessItem;
  visible: boolean;
  loading: boolean;
  password: string | null;
  copiedUser: boolean;
  copiedPass: boolean;
  strength: number;
  strengthColor: string;
  onReveal: () => void;
  onCopy: (text: string | null, type: 'USER' | 'PASS') => void;
}

export function AccessCredentialFields({
  item, visible, loading, password, copiedUser, copiedPass, strength, strengthColor, onReveal, onCopy,
}: AccessCredentialFieldsProps) {
  return (
    <CardContent className="p-6 flex flex-col gap-4 flex-1">

      {/* Identificação (Username) */}
      <div className="group/field relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
          <User className="h-4 w-4" />
        </div>
        <div className="flex items-center bg-muted/20 border border-border/40 rounded-xl pl-9 pr-9 h-10 transition-colors group-hover/field:border-primary/30 group-hover/field:bg-muted/40">
          <span className="text-xs font-bold font-mono tracking-tight truncate select-all text-foreground/80">
            {item.username || "SEM_ID"}
          </span>
        </div>
        {item.username && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1 h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            onClick={() => onCopy(item.username, 'USER')}
          >
            {copiedUser ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>

      {/* Chave de Acesso (Password) */}
      <div className="group/pass relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
          {visible ? <LockOpen className="h-4 w-4 text-primary" /> : <Key className="h-4 w-4" />}
        </div>

        <div className={cn(
          "flex items-center justify-between bg-background border border-border/40 rounded-xl pl-9 pr-1 h-11 transition-all",
          visible && "ring-1 ring-primary/30 border-primary/40 bg-primary/5 shadow-inner"
        )}>
          <div className="flex-1 overflow-hidden mr-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : visible ? (
              <span className="font-mono text-xs font-bold truncate select-all tracking-wider text-foreground">{password}</span>
            ) : (
              <div className="flex gap-1.5 items-center h-full">
                {[...Array(8)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/20" />)}
              </div>
            )}
          </div>

          <div className="flex items-center gap-0.5">
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted/50 text-muted-foreground" onClick={onReveal}>
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <div className="w-px h-5 bg-border/60 mx-1" />
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 text-muted-foreground" onClick={() => onCopy(password, 'PASS')} disabled={!visible}>
              {copiedPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Medidor de Força Estilo HUD */}
        {visible && password && (
          <div className="absolute -bottom-1.5 left-2 right-2">
            <div className="h-1 w-full bg-background border border-border/40 rounded-full overflow-hidden flex">
              <div
                className={cn("h-full transition-all duration-700 ease-out", strengthColor)}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </CardContent>
  );
}
