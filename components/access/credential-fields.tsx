"use client";

import { useEffect, useRef, useState } from "react";
import { AccessItem } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Copy, Eye, EyeOff, Key, Check, User, LockOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revealPassword } from "@/app/(dashboard)/access/actions";
import { calculateStrength } from "./access-helpers";
import { cn } from "@/lib/utils";

/** Senha revelada volta a se esconder sozinha depois disso. */
const AUTO_HIDE_MS = 30_000;
/** Senha copiada sai do clipboard depois disso (padrão de gerenciadores de senha). */
const CLIPBOARD_TTL_MS = 35_000;

// Limpa o clipboard após o TTL — só se ele ainda contiver a senha copiada
// (não atropela algo que o usuário copiou depois). Sem permissão de leitura,
// não dá para conferir: aí não mexe (melhor que apagar conteúdo alheio).
function scheduleClipboardClear(secret: string): void {
  setTimeout(async () => {
    try {
      const current = await navigator.clipboard.readText();
      if (current === secret) await navigator.clipboard.writeText("");
    } catch {
      // Leitura negada/aba sem foco: não arrisca sobrescrever o clipboard.
    }
  }, CLIPBOARD_TTL_MS);
}

// Campos de identificação + chave de acesso, com lógica de revelar/copiar autocontida.
export function CredentialFields({ item }: { item: AccessItem }) {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-ocultar: além de esconder, descarta a senha decifrada da memória.
  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!visible) return;
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setPassword(null);
    }, AUTO_HIDE_MS);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [visible]);

  // Garante a senha decifrada em memória (sem necessariamente exibir na tela).
  const ensurePassword = async (): Promise<string | null> => {
    if (password) return password;
    const decrypted = await revealPassword(item.id);
    setPassword(decrypted);
    return decrypted;
  };

  const handleReveal = async () => {
    if (visible) { setVisible(false); return; }
    if (password) { setVisible(true); return; }

    try {
      setLoading(true);
      await ensurePassword();
      setVisible(true);
    } catch {
      toast.error("Decodificação falhou.");
    } finally {
      setLoading(false);
    }
  };

  // Copia a senha SEM precisar revelá-la na tela (decifra sob demanda).
  const handleCopyPassword = async () => {
    try {
      setCopying(true);
      const pwd = await ensurePassword();
      if (!pwd) return toast.info("Senha vazia");
      await navigator.clipboard.writeText(pwd);
      scheduleClipboardClear(pwd);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
      toast.success("Senha copiada — o clipboard se limpa em 35s.", { duration: 2500 });
    } catch {
      toast.error("Falha ao copiar a senha.");
    } finally {
      setCopying(false);
    }
  };

  const handleCopy = (text: string | null, type: 'USER' | 'PASS') => {
    if (!text) return toast.info("Campo vazio");

    navigator.clipboard.writeText(text);
    if (type === 'USER') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
    toast.success("Copiado!", { duration: 1500 });
  };

  const strength = calculateStrength(password);
  const strengthColor = strength > 80 ? "bg-emerald-500" : strength > 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <>
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
            onClick={() => handleCopy(item.username, 'USER')}
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
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted/50 text-muted-foreground" onClick={handleReveal}>
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <div className="w-px h-5 bg-border/60 mx-1" />
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 text-muted-foreground" onClick={handleCopyPassword} disabled={copying} title="Copiar senha (sem exibir)">
              {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : copiedPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
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
    </>
  );
}
