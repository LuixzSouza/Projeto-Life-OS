"use client";

// Política de privacidade da IA (Configurações → Inteligência Artificial).
// Tudo OPT-IN, desligado por padrão — filosofia local-first do Life OS.

import { useState } from "react";
import { ShieldCheck, Globe, HardDrive, Coins } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { updateAiPrefs, type AiPrefs } from "@/app/(dashboard)/settings/actions/ai-prefs";

const OPTIONS: { key: keyof AiPrefs; icon: typeof Globe; title: string; desc: string }[] = [
  {
    key: "aiWebAccess",
    icon: Globe,
    title: "Acesso à web",
    desc: "Permite que a IA busque na internet e leia páginas quando você pedir. Suas perguntas podem sair do seu computador.",
  },
  {
    key: "aiPrivacyRouting",
    icon: HardDrive,
    title: "Roteador de privacidade",
    desc: "Assuntos sensíveis (cofre, saúde, finanças detalhadas) são respondidos pelo Ollama LOCAL quando disponível — nada vai para a nuvem.",
  },
  {
    key: "aiCostRouting",
    icon: Coins,
    title: "Roteador de custo",
    desc: "Perguntas triviais (\"oi\", \"obrigado\") usam um modelo mais barato/rápido do mesmo provedor, economizando tokens.",
  },
];

export function AiPrivacyCard({ initial }: { initial: AiPrefs }) {
  const [prefs, setPrefs] = useState<AiPrefs>(initial);

  const toggle = async (key: keyof AiPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    const r = await updateAiPrefs({ [key]: value });
    if (!r.success) {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
      toast.error("Não foi possível salvar a preferência.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Privacidade &amp; roteamento da IA</p>
          <p className="text-xs text-muted-foreground">Tudo opcional e desligado por padrão. Você decide até onde a IA vai.</p>
        </div>
      </div>

      <ul className="space-y-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <li key={opt.key} className="flex items-start justify-between gap-4 rounded-xl border border-border/40 bg-background/60 px-3.5 py-3">
              <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground/90">{opt.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{opt.desc}</p>
                </div>
              </div>
              <Switch
                checked={prefs[opt.key]}
                onCheckedChange={(v) => void toggle(opt.key, v)}
                aria-label={opt.title}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
