"use client";

// Entrega de notificações por e-mail (Configurações). Opt-in, privacy-first:
// usa o SMTP do próprio usuário (ex.: Gmail + senha de app) para mandar os
// avisos importantes ao celular. Nada passa por servidor nosso.

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { BellRing, Mail, Send, Loader2, ChevronDown, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  saveNotificationSettings,
  sendTestNotificationEmail,
  type NotifyEmailInput,
} from "@/app/(dashboard)/settings/actions/notifications";

export interface NotificationSettingsInitial {
  enabled: boolean;
  email: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  hasPassword: boolean; // senha existe salva? (nunca enviamos a senha ao cliente)
  minPriority: "LOW" | "NORMAL" | "HIGH";
}

const PRIORITY_LABELS: { value: "HIGH" | "NORMAL" | "LOW"; label: string; hint: string }[] = [
  { value: "HIGH", label: "Só urgentes", hint: "Faturas atrasadas, contas vencendo, tetos estourados" },
  { value: "NORMAL", label: "Normais e urgentes", hint: "O acima + eventos, aniversários, cobranças" },
  { value: "LOW", label: "Tudo", hint: "Todos os avisos, inclusive lembretes leves" },
];

export function NotificationsCard({ initial }: { initial: NotificationSettingsInitial }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [email, setEmail] = useState(initial.email);
  const [smtpHost, setSmtpHost] = useState(initial.smtpHost || "smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState(String(initial.smtpPort || 465));
  const [smtpUser, setSmtpUser] = useState(initial.smtpUser);
  const [smtpPass, setSmtpPass] = useState("");
  const [minPriority, setMinPriority] = useState(initial.minPriority);
  const [showServer, setShowServer] = useState(!initial.smtpUser);
  const [saving, startSaving] = useTransition();
  const [testing, setTesting] = useState(false);

  const payload = (): NotifyEmailInput => ({
    enabled,
    email: email.trim(),
    smtpHost: smtpHost.trim(),
    smtpPort: parseInt(smtpPort, 10) || 465,
    smtpUser: smtpUser.trim(),
    smtpPass,
    minPriority,
  });

  const onSave = () => {
    startSaving(async () => {
      const r = await saveNotificationSettings(payload());
      if (r.ok) {
        setSmtpPass(""); // já cifrada no servidor; some do form
        toast.success(enabled ? "Notificações por e-mail ativadas." : "Preferências salvas.");
      } else {
        toast.error(r.error ?? "Não foi possível salvar.");
      }
    });
  };

  const onTest = async () => {
    setTesting(true);
    const { enabled: _e, minPriority: _m, ...rest } = payload();
    void _e; void _m;
    const r = await sendTestNotificationEmail(rest);
    setTesting(false);
    if (r.ok) toast.success("E-mail de teste enviado! Confira sua caixa (e o spam).");
    else toast.error(r.error ?? "Falha ao enviar o teste.");
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho + toggle mestre */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BellRing className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">Receber no celular (e-mail)</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Envie os avisos importantes para o seu e-mail — assim você é notificado no celular
              mesmo com o Life OS fechado. Usa o seu próprio e-mail; nada passa por servidores nossos.
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Ativar notificações por e-mail" />
      </div>

      <div className={cn("space-y-4 transition-opacity", !enabled && "pointer-events-none opacity-50")}>
        {/* Destino */}
        <div className="space-y-1.5">
          <Label htmlFor="notify-email">E-mail para receber os avisos</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="notify-email" type="email" inputMode="email" placeholder="voce@gmail.com"
              value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">Se vazio, usamos o e-mail remetente abaixo.</p>
        </div>

        {/* Nível mínimo */}
        <div className="space-y-1.5">
          <Label>Quando enviar</Label>
          <Select value={minPriority} onValueChange={(v) => setMinPriority(v as "LOW" | "NORMAL" | "HIGH")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRIORITY_LABELS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="font-medium">{p.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.hint}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Configuração do servidor (recolhível) */}
        <div className="rounded-xl border border-border/40 bg-background/60">
          <button
            type="button"
            onClick={() => setShowServer((s) => !s)}
            className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
          >
            <span className="text-sm font-semibold text-foreground/90">Servidor de envio (SMTP)</span>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showServer && "rotate-180")} />
          </button>

          {showServer && (
            <div className="space-y-4 border-t border-border/40 px-3.5 py-3.5">
              <p className="rounded-lg bg-primary/5 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                Para Gmail: mantenha o host e a porta abaixo, use seu Gmail como remetente e gere uma{" "}
                <a
                  href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                >
                  Senha de app <ExternalLink className="h-3 w-3" />
                </a>{" "}
                (a senha normal não funciona com verificação em duas etapas).
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="smtp-host">Host</Label>
                  <Input id="smtp-host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-port">Porta</Label>
                  <Input id="smtp-port" inputMode="numeric" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ""))} placeholder="465" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-user">E-mail remetente (conta SMTP)</Label>
                <Input id="smtp-user" type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="voce@gmail.com" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smtp-pass">Senha de app</Label>
                <Input
                  id="smtp-pass" type="password" autoComplete="off"
                  value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder={initial.hasPassword ? "•••••••• (salva — deixe em branco p/ manter)" : "16 caracteres do Google"}
                />
                <p className="text-[11px] text-muted-foreground">Guardada cifrada no seu banco. Nunca sai do seu controle.</p>
              </div>
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
          <Button variant="outline" onClick={() => void onTest()} disabled={testing}>
            {testing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            Enviar e-mail de teste
          </Button>
        </div>
      </div>
    </div>
  );
}
