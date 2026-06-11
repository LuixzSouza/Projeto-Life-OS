"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import {
  Smartphone, Wifi, Globe, Copy, Check, ShieldCheck, MonitorSmartphone, CloudUpload,
  Power, BrickWall, Loader2, CalendarDays,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  setStartWithWindows,
  requestFirewallRule,
} from "@/app/(dashboard)/settings/actions";

interface RemoteAccessCardProps {
  /** URLs http://IP:porta detectadas nas interfaces de rede do PC (rede local). */
  lanUrls: string[];
  /** Modo atual do banco — muda a recomendação de acesso externo. */
  mode: string;
  /** Integração com o Windows (null = ambiente sem suporte, esconde a seção). */
  windows?: { available: boolean; startWithWindows: boolean } | null;
  /** Token assinado do feed iCal da Agenda (null = JWT_SECRET ausente). */
  calendarToken?: string | null;
}

// Painel "Acesso pelo celular": 3 camadas de alcance, da mais simples (mesma
// rede Wi‑Fi, dados 100% no PC) à mais ampla (internet). Sem dependência de
// serviços pagos — privacidade em primeiro lugar.
export function RemoteAccessCard({ lanUrls, mode, windows, calendarToken }: RemoteAccessCardProps) {
  const [selected, setSelected] = useState(0);
  const [copied, setCopied] = useState(false);
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [autoStart, setAutoStart] = useState(windows?.startWithWindows ?? false);
  const [isTogglingStart, setIsTogglingStart] = useState(false);
  const [isFirewall, setIsFirewall] = useState(false);
  // Origin só existe no navegador — preencher pós-hidratação evita mismatch SSR.
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const url = lanUrls[selected] ?? null;

  // URL do feed pela origem em uso AGORA (LAN, Tailscale ou nuvem): quem assina
  // é o aparelho que vai buscar — o endereço que funciona no navegador funciona
  // no app de calendário.
  const calendarUrl = calendarToken && origin ? `${origin}/api/calendar/${calendarToken}.ics` : null;

  const copyCalendar = () => {
    if (!calendarUrl) return;
    navigator.clipboard.writeText(calendarUrl);
    setCalendarCopied(true);
    toast.success("Link do calendário copiado!");
    setTimeout(() => setCalendarCopied(false), 2000);
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Endereço copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAutoStart = async (enabled: boolean) => {
    setIsTogglingStart(true);
    setAutoStart(enabled);
    try {
      const res = await setStartWithWindows(enabled);
      if (res.success) toast.success(res.message);
      else {
        setAutoStart(!enabled);
        toast.error(res.message);
      }
    } catch {
      setAutoStart(!enabled);
      toast.error("Falha ao configurar a inicialização automática.");
    } finally {
      setIsTogglingStart(false);
    }
  };

  const handleFirewall = async () => {
    setIsFirewall(true);
    try {
      const res = await requestFirewallRule();
      if (res.success) toast.info(res.message, { duration: 8000 });
      else toast.error(res.message);
    } catch {
      toast.error("Falha ao pedir a regra de firewall.");
    } finally {
      setIsFirewall(false);
    }
  };

  return (
    <Card className="border-border shadow-sm bg-card">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
            <MonitorSmartphone className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-foreground">Acesso pelo celular</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seus dados moram neste computador. Com ele ligado e o Life OS aberto
              (atalho da área de trabalho ou <code className="text-[10px] bg-muted px-1 rounded">npm run life</code>),
              outros aparelhos podem acessar o sistema pelo navegador.
            </p>
          </div>
        </div>

        {/* Camada 1 — mesma rede Wi‑Fi */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4 text-emerald-500" />
            <h5 className="text-sm font-semibold text-foreground">Na mesma rede Wi‑Fi</h5>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
              100% LOCAL
            </span>
          </div>

          {url ? (
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* QR precisa de fundo claro para leitura — fixo mesmo no dark mode */}
              <div className="rounded-xl bg-white p-3 shadow-sm border border-border/40 shrink-0">
                <QRCode value={url} size={132} />
              </div>
              <div className="space-y-2 w-full min-w-0">
                <p className="text-xs text-muted-foreground">
                  Aponte a câmera do celular para o código, ou digite no navegador:
                </p>
                {lanUrls.map((u, i) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => { setSelected(i); copy(u); }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left font-mono text-xs transition-all",
                      i === selected
                        ? "border-primary/40 bg-primary/5 text-foreground"
                        : "border-border/40 bg-background text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    <span className="truncate">{u}</span>
                    {i === selected && copied
                      ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />}
                  </button>
                ))}
                <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                  Se não abrir, libere o Node.js no Firewall do Windows
                  (Configurações → Firewall → Permitir um aplicativo → marque <strong>redes privadas</strong>).
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma rede local detectada — conecte o PC ao Wi‑Fi ou cabo de rede.
            </p>
          )}
        </div>

        {/* Camada 2 — de qualquer lugar */}
        <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-500" />
            <h5 className="text-sm font-semibold text-foreground">De qualquer lugar (fora de casa)</h5>
          </div>

          {mode === "replica" ? (
            <div className="flex items-start gap-3">
              <CloudUpload className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Você já está coberto:</strong> o modo Híbrido sincroniza
                este PC com a nuvem (Turso). Basta acessar a sua instância na Vercel de qualquer rede —
                as escritas do PC chegam lá na hora, e o que você fizer no celular aparece aqui no próximo sync.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para acessar de fora sem mandar seus dados para a nuvem, a opção mais segura é o{" "}
              <strong className="text-foreground">Tailscale</strong> (VPN pessoal, grátis, sem abrir portas no roteador).
            </p>
          )}

          <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside marker:font-bold marker:text-primary">
            <li>Instale o Tailscale no PC (<span className="font-mono text-[11px]">tailscale.com/download</span>) e no celular (loja de apps), entrando com a mesma conta.</li>
            <li>No PC, deixe o Tailscale e o Life OS abertos.</li>
            <li>No celular (em qualquer rede, até 4G/5G), acesse <span className="font-mono text-[11px]">http://&lt;nome-do-pc&gt;:{url ? url.split(":").pop() : "3000"}</span> — o nome aparece no app do Tailscale.</li>
          </ol>

          <div className="flex items-start gap-2 rounded-lg bg-blue-500/5 border border-blue-500/20 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O tráfego é criptografado de ponta a ponta entre os seus aparelhos — nada fica exposto na
              internet e os dados continuam só no seu PC.
            </p>
          </div>
        </div>

        {/* Agenda no calendário nativo (feed iCal) */}
        {calendarToken && (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              <h5 className="text-sm font-semibold text-foreground">Agenda no calendário do celular (iCal)</h5>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Assine este link no app de calendário e os compromissos do Life OS (eventos, prazos,
              cobranças, aniversários, revisões…) aparecem no calendário nativo — sem abrir o app.
            </p>

            <button
              type="button"
              onClick={copyCalendar}
              disabled={!calendarUrl}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/40 bg-background px-3 py-2 text-left font-mono text-xs text-muted-foreground transition-all hover:border-primary/30 disabled:opacity-50"
            >
              <span className="truncate">{calendarUrl ?? "Carregando endereço…"}</span>
              {calendarCopied
                ? <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                : <Copy className="h-3.5 w-3.5 shrink-0 opacity-60" />}
            </button>

            <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">iPhone:</strong> Ajustes → Apps → Calendário → Contas →
                Adicionar conta → Outra → <em>Adicionar calendário por assinatura</em> → cole o link.
              </li>
              <li>
                <strong className="text-foreground">Android:</strong> apps como ICSx⁵ (grátis) assinam o link
                e sincronizam com o Google Calendar do aparelho.
              </li>
              <li>
                <strong className="text-foreground">Google Calendar (web):</strong> Outros calendários → + →
                <em> Por URL</em> — só funciona se o Life OS estiver acessível pela internet (instância na nuvem),
                pois o Google busca o feed dos servidores dele.
              </li>
            </ul>

            <div className="flex items-start gap-2 rounded-lg bg-violet-500/5 border border-violet-500/20 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                O link contém um token assinado — quem tiver o link enxerga a agenda, então trate-o como senha.
                Usar &quot;Desconectar outros dispositivos&quot; (aba Segurança) renova o token e invalida o link antigo.
              </p>
            </div>
          </div>
        )}

        {/* Camada 3 — sem fricção no PC (Windows) */}
        {windows?.available && (
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-amber-500" />
              <h5 className="text-sm font-semibold text-foreground">Sem fricção no PC</h5>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">Iniciar com o Windows</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  O servidor sobe sozinho quando o PC liga — o celular sempre encontra o Life OS.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isTogglingStart && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <Switch checked={autoStart} onCheckedChange={handleAutoStart} disabled={isTogglingStart} />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">Liberar no Firewall do Windows</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Cria a regra das portas 3000–3011 (apenas redes privadas). Pede confirmação
                  de administrador <strong>na tela do PC</strong>, uma única vez.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={handleFirewall}
                disabled={isFirewall}
              >
                {isFirewall ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BrickWall className="h-3.5 w-3.5" />}
                Liberar
              </Button>
            </div>
          </div>
        )}

        {/* Dica: instalar como app */}
        <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/20 p-4">
          <Smartphone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Dica:</strong> depois de abrir no celular, use
            “Adicionar à tela inicial” no menu do navegador — o Life OS é instalável (PWA) e
            vira um app com ícone próprio.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => url && copy(url)}
          disabled={!url}
        >
          <Copy className="h-3.5 w-3.5 mr-2" /> Copiar endereço selecionado
        </Button>
      </CardContent>
    </Card>
  );
}
