"use client";

import { useState } from "react";
import { Share2, ShieldCheck, Copy, Check, Loader2, Link2, MessageCircle, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { revealPassword } from "@/app/(dashboard)/access/actions";
import { encryptCredential } from "@/lib/share-crypto";
import { cn } from "@/lib/utils";
import type { AccessData } from "./access-form";

// Compartilhar uma credencial com um amigo. Gera um LINK SEGURO cujo segredo fica no
// fragmento da URL (#...) — decifrado só no navegador de quem abrir, nunca no servidor.
// Também oferece "copiar como texto" para o envio rápido (com aviso de texto puro).
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

  const reset = () => { setLink(null); setCopied(false); setGenerating(false); };
  const handleOpenChange = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  const generateLink = async () => {
    if (!item.id) return;
    setGenerating(true);
    try {
      const password = await revealPassword(item.id);
      const token = await encryptCredential({
        title: item.title,
        username: item.username,
        password,
        url: item.url,
        notes: item.notes,
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
    await navigator.clipboard.writeText(link);
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
      await navigator.clipboard.writeText(lines.join("\n"));
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
              envie só para a pessoa certa, por um canal de confiança. (Nesta versão o link
              não expira.)
            </p>
          </div>

          {!link ? (
            <Button onClick={generateLink} disabled={generating} className="h-12 w-full gap-2 text-sm font-bold">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {generating ? "Gerando link seguro…" : "Gerar link seguro"}
            </Button>
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
