"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { LockKeyhole, User, Key, Eye, EyeOff, Copy, Check, ExternalLink, ShieldCheck, AlertTriangle, Loader2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { decryptCredential, type SharedCredential } from "@/lib/share-crypto";
import { copyToClipboard, scheduleClipboardClear } from "@/lib/clipboard";

// Página PÚBLICA (sem login) que recebe um link de credencial compartilhada. O segredo
// vem no fragmento (#...), que nunca é enviado ao servidor — deciframos aqui no
// navegador. A senha some sozinha depois de um tempo (mesma postura do cofre).
const AUTO_HIDE_SECONDS = 60;

export default function SharedCredentialPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error" | "expired">("loading");
  const [cred, setCred] = useState<SharedCredential | null>(null);
  const [visible, setVisible] = useState(false);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  // Segundos até a senha se esconder sozinha (e contador visível p/ não pegar de surpresa).
  const [secondsLeft, setSecondsLeft] = useState(AUTO_HIDE_SECONDS);
  // Quando o copiar falha (webview travado), revelamos e pedimos cópia manual.
  const [copyFailed, setCopyFailed] = useState(false);

  // Título da aba genérico (sem vazar o segredo) — a página é client, sem metadata.
  useEffect(() => { document.title = "Credencial compartilhada · Life OS"; }, []);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    // Sempre pelo caminho assíncrono: evita setState síncrono no corpo do efeito.
    (token ? decryptCredential(token) : Promise.reject(new Error("sem token")))
      .then((c) => {
        // Expiração embutida no payload cifrado: link vencido não revela a senha.
        if (c.expiresAt && Date.now() > c.expiresAt) { setStatus("expired"); return; }
        setCred(c);
        setStatus("ok");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      // Atualizações dentro do callback do timer (não no corpo do efeito): ok.
      setSecondsLeft((s) => {
        if (s <= 1) { setVisible(false); return AUTO_HIDE_SECONDS; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [visible]);

  // Revelar/ocultar a senha — ao revelar, reinicia a contagem regressiva.
  const toggleVisible = () => {
    if (!visible) setSecondsLeft(AUTO_HIDE_SECONDS);
    setVisible((v) => !v);
  };

  const copy = async (text: string | null | undefined, which: "user" | "pass") => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (!ok) {
      // Sem clipboard: mostra a senha e orienta a copiar à mão — nada de "copiado" falso.
      setCopyFailed(true);
      if (which === "pass") { setVisible(true); setSecondsLeft(AUTO_HIDE_SECONDS); }
      setTimeout(() => setCopyFailed(false), 4000);
      return;
    }
    if (which === "user") { setCopiedUser(true); setTimeout(() => setCopiedUser(false), 2000); }
    else {
      // Paridade com o cofre: a senha sai do clipboard sozinha depois de um tempo.
      scheduleClipboardClear(text);
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  // Fluxo de quem recebe: copia a senha e abre o site na sequência.
  const openSiteAndCopy = async () => {
    if (!cred?.url) return;
    await copy(cred.password, "pass");
    const href = cred.url.startsWith("http") ? cred.url : `https://${cred.url}`;
    window.open(href, "_blank", "noopener,noreferrer");
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
              <h1 className="text-lg font-bold">Link inválido</h1>
              <p className="max-w-xs text-sm text-muted-foreground">
                Este link de credencial não pôde ser aberto. Ele pode ter sido copiado
                pela metade — peça para a pessoa enviar de novo, completo.
              </p>
            </div>
          )}

          {status === "expired" && (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Clock className="h-6 w-6" />
              </span>
              <h1 className="text-lg font-bold">Link expirado</h1>
              <p className="max-w-xs text-sm text-muted-foreground">
                Por segurança, este link tinha prazo de validade e já não revela a senha.
                Peça para a pessoa gerar um link novo.
              </p>
            </div>
          )}

          {status === "ok" && cred && (
            <>
              <div className="border-b border-border/40 bg-muted/10 px-6 py-5">
                {cred.from && (
                  <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                    Enviado por <span className="font-semibold text-foreground">{cred.from}</span>
                  </p>
                )}
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
                    {/* Máscara de largura fixa: não vaza o comprimento real da senha. */}
                    {visible ? cred.password : "••••••••••"}
                  </span>
                  {visible && (
                    <span
                      className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground"
                      title="A senha se oculta sozinha por segurança"
                    >
                      {secondsLeft}s
                    </span>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={toggleVisible} aria-label={visible ? "Ocultar" : "Mostrar"}>
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <CopyBtn copied={copiedPass} onClick={() => copy(cred.password, "pass")} />
                </Field>

                {cred.notes && (
                  <div className="rounded-xl border border-border/40 bg-muted/10 p-3 text-sm text-muted-foreground">
                    {cred.notes}
                  </div>
                )}

                {cred.url && (
                  <Button onClick={openSiteAndCopy} className="h-11 w-full gap-2 text-sm font-semibold">
                    <ExternalLink className="h-4 w-4" /> Abrir site e copiar senha
                  </Button>
                )}

                {copyFailed && (
                  <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-center text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    Não foi possível copiar automaticamente neste navegador — segure sobre a senha e copie à mão.
                  </p>
                )}

                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>É um segredo compartilhado: não repasse este link e apague a conversa depois de salvar a senha.</span>
                </div>

                {cred.expiresAt && (
                  <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    Este link expira em {new Date(cred.expiresAt).toLocaleString("pt-BR", {
                      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                )}
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
