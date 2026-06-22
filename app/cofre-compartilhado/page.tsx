"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, User, Key, Eye, EyeOff, Copy, Check, ExternalLink, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { decryptCredential, type SharedCredential } from "@/lib/share-crypto";

// Página PÚBLICA (sem login) que recebe um link de credencial compartilhada. O segredo
// vem no fragmento (#...), que nunca é enviado ao servidor — deciframos aqui no
// navegador. A senha some sozinha depois de um tempo (mesma postura do cofre).
const AUTO_HIDE_MS = 60_000;

export default function SharedCredentialPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [cred, setCred] = useState<SharedCredential | null>(null);
  const [visible, setVisible] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    // Sempre pelo caminho assíncrono: evita setState síncrono no corpo do efeito.
    (token ? decryptCredential(token) : Promise.reject(new Error("sem token")))
      .then((c) => { setCred(c); setStatus("ok"); })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (!visible) return;
    hideTimer.current = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => { if (hideTimer.current) clearTimeout(hideTimer.current); };
  }, [visible]);

  const copy = async (text: string | null | undefined, which: "user" | "pass") => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    if (which === "user") { setCopiedUser(true); setTimeout(() => setCopiedUser(false), 2000); }
    else { setCopiedPass(true); setTimeout(() => setCopiedPass(false), 2000); }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/20 p-4">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
          <LockKeyhole className="h-4 w-4 text-primary" /> Life OS · Credencial compartilhada
        </div>

        <div className="overflow-hidden rounded-3xl border border-border/50 bg-background shadow-2xl">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm">Abrindo com segurança…</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <h1 className="text-lg font-bold">Link inválido ou expirado</h1>
              <p className="max-w-xs text-sm text-muted-foreground">
                Este link de credencial não pôde ser aberto. Ele pode ter sido copiado
                pela metade — peça para a pessoa enviar de novo, completo.
              </p>
            </div>
          )}

          {status === "ok" && cred && (
            <>
              <div className="border-b border-border/40 bg-muted/10 px-6 py-5">
                <h1 className="text-lg font-bold leading-tight">{cred.title}</h1>
                {cred.url && (
                  <a
                    href={cred.url.startsWith("http") ? cred.url : `https://${cred.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    {cred.url} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="space-y-3 px-6 py-5">
                {/* Usuário */}
                {cred.username && (
                  <Field label="Usuário" icon={<User className="h-4 w-4" />}>
                    <span className="min-w-0 flex-1 truncate font-mono text-sm">{cred.username}</span>
                    <CopyBtn copied={copiedUser} onClick={() => copy(cred.username, "user")} />
                  </Field>
                )}

                {/* Senha */}
                <Field label="Senha" icon={<Key className="h-4 w-4" />}>
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {visible ? cred.password : "•".repeat(Math.min(14, cred.password.length || 8))}
                  </span>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setVisible((v) => !v)} aria-label={visible ? "Ocultar" : "Mostrar"}>
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <CopyBtn copied={copiedPass} onClick={() => copy(cred.password, "pass")} />
                </Field>

                {cred.notes && (
                  <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-sm text-muted-foreground">
                    {cred.notes}
                  </div>
                )}

                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>É um segredo compartilhado: não repasse este link e apague a conversa depois de salvar a senha.</span>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          Decifrado no seu navegador. O <Link href="/" className="font-medium text-primary hover:underline">Life OS</Link> nunca recebe esta senha.
        </p>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-muted/20 py-1.5 pl-3 pr-1">
        <span className="text-muted-foreground/60">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function CopyBtn({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <Button size="icon" variant="ghost" className={cn("h-8 w-8 rounded-lg", copied && "text-emerald-500")} onClick={onClick} aria-label="Copiar">
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
