"use client";

import { useState } from "react";
import { Share2, ShieldCheck, Copy, Check, Loader2, Link2, MessageCircle, AlertTriangle, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { revealPassword, getShareSenderName } from "@/app/(dashboard)/access/actions";
import { encryptCredential } from "@/lib/share-crypto";
import { copyToClipboard } from "@/lib/clipboard";
import { cn } from "@/lib/utils";
import type { AccessData } from "./access-form";

// Compartilhar uma credencial com um amigo. Gera um LINK SEGURO cujo segredo fica no
// fragmento da URL (#...) — decifrado só no navegador de quem abrir, nunca no servidor.
// Também oferece "copiar como texto" para o envio rápido (com aviso de texto puro).

// Validade do link: vira um `expiresAt` cifrado no payload (ver share-crypto).
type ExpiryOption = "24h" | "7d" | "30d" | "never";
const EXPIRY_MS: Record<ExpiryOption, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  never: 0,
};
const EXPIRY_LABELS: Record<ExpiryOption, string> = {
  "24h": "24 horas",
  "7d": "7 dias",
  "30d": "30 dias",
  never: "Nunca",
};
export function ShareAccessDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AccessData;
}) {
  const [link, setLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  // Validade do link (escolhida ANTES de gerar — vai cifrada no payload). Padrão: 7 dias.
  const [expiry, setExpiry] = useState<ExpiryOption>("7d");

  const reset = () => { setLink(null); setCopied(false); setGenerating(false); };
  const handleOpenChange = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const generateLink = async () => {
    if (!item.id) return;
    setGenerating(true);
    try {
      const [password, from] = await Promise.all([revealPassword(item.id), getShareSenderName()]);
      const ms = EXPIRY_MS[expiry];
      const token = await encryptCredential({
        title: item.title,
        username: item.username,
        password,
        url: item.url,
        notes: item.notes,
        from: from || null,
        expiresAt: ms ? Date.now() + ms : null,
      });
      setLink(`${window.location.origin}/cofre-compartilhado#${token}`);
    } catch {
      toast.error("Não foi possível gerar o link.");
    } finally {
      setGenerating(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    if (!(await copyToClipboard(link))) {
      toast.error("Não foi possível copiar. Selecione o link e copie à mão.");
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  };

  const shareWhatsApp = () => {
    if (!link) return;
    const msg = `Te enviei uma credencial pelo Life OS (link seguro — abre e copia):\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareNative = async () => {
    if (!link || !navigator.share) return;
    try {
      await navigator.share({ title: `Credencial: ${item.title}`, text: "Link seguro do Life OS", url: link });
    } catch { /* usuário cancelou */ }
  };

  // Envio rápido em texto puro (atalho do dia a dia, com aviso claro).
  const copyAsText = async () => {
    if (!item.id) return;
    try {
      const password = await revealPassword(item.id);
      const lines = [
        item.title,
        item.url ? `Site: ${item.url}` : null,
        item.username ? `Usuário: ${item.username}` : null,
        `Senha: ${password}`,
      ].filter(Boolean);
      if (!(await copyToClipboard(lines.join("\n")))) {
        toast.error("Não foi possível copiar.");
        return;
      }
      toast.success("Copiado em texto. Cuidado: vai sem criptografia.", { duration: 3000 });
    } catch {
      toast.error("Falha ao copiar.");
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader
          icon={<Share2 />}
          title="Compartilhar credencial"
          description={`Enviar "${item.title}" para um amigo com segurança.`}
        />

        <DialogBody className="space-y-4">
          {/* Como funciona / aviso de segurança */}
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              O link carrega a senha <strong>cifrada no próprio endereço</strong> — o segredo
              nunca passa pelo servidor. Mas <strong>quem tiver o link consegue ver</strong>:
              envie só para a pessoa certa, por um canal de confiança.
            </p>
          </div>

          {!link ? (
            <div className="space-y-3">
              {/* Validade do link (escolha antes de gerar). */}
              <div className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> Validade do link
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(EXPIRY_LABELS) as ExpiryOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setExpiry(opt)}
                      className={cn(
                        "rounded-lg border py-2 text-xs font-semibold transition-colors",
                        expiry === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                      )}
                    >
                      {EXPIRY_LABELS[opt]}
                    </button>
                  ))}
                </div>
                {expiry === "never" && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    Sem validade: o link revela a senha para sempre. Prefira um prazo curto.
                  </p>
                )}
              </div>

              <Button onClick={generateLink} disabled={generating} className="h-12 w-full gap-2 text-sm font-bold">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {generating ? "Gerando link seguro…" : "Gerar link seguro"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Link gerado */}
              <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-1.5 pl-3">
                <Link2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">{link}</span>
                <Button size="icon" variant="ghost" onClick={copyLink} className="h-8 w-8 shrink-0 rounded-lg" aria-label="Copiar link">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3 shrink-0" />
                {expiry === "never"
                  ? "Este link não expira."
                  : `Expira em ${EXPIRY_LABELS[expiry]} — depois disso deixa de abrir.`}
              </p>

              {/* Ações de envio */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={shareWhatsApp} variant="outline" className="h-11 gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
                {canNativeShare ? (
                  <Button onClick={shareNative} variant="outline" className="h-11 gap-2">
                    <Share2 className="h-4 w-4" /> Compartilhar…
                  </Button>
                ) : (
                  <Button onClick={copyLink} variant="outline" className="h-11 gap-2">
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />} Copiar link
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Atalho: texto puro */}
          <div className="border-t border-border/40 pt-3">
            <button
              type="button"
              onClick={copyAsText}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium",
                "text-muted-foreground transition-colors hover:text-foreground",
              )}
            >
              <FileText className="h-3.5 w-3.5" /> Copiar como texto (sem criptografia)
            </button>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
