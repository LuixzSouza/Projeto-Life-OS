"use client";

// Cabeçalho ranqueado dos Estudos: o antigo "Nível" virou ELO (estilo fila
// ranqueada): estudar rende PDL, ficar parado decai (a partir do Ouro). O
// brasão usa a cor do tier; a barra mostra o avanço na divisão; avisos de
// ganho do dia / carência / decaimento contam a história sem precisar abrir nada.

import {
  Clock, Layers, Sparkles, Shield, ShieldCheck, Medal, Gem, Diamond, Crown,
  Trophy, Info, Flame, TrendingDown, Hourglass, type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  ELO_TIERS, GRACE_DAYS, DAILY_LP_CAP, type EloResult,
} from "@/lib/studies-elo";

const TIER_ICONS: Record<string, LucideIcon> = {
  ferro: Shield,
  bronze: Shield,
  prata: ShieldCheck,
  ouro: Medal,
  platina: Gem,
  esmeralda: Gem,
  diamante: Diamond,
  mestre: Crown,
  graomestre: Crown,
  desafiante: Trophy,
};

interface GamificationHeroProps {
  elo: EloResult;
  totalHours: string;
  totalSessions: number;
  totalXP: number;
}

export function GamificationHero({ elo, totalHours, totalSessions, totalXP }: GamificationHeroProps) {
  const Icon = TIER_ICONS[elo.tier.key] ?? Shield;
  const color = elo.tier.color;

  return (
    <section
      aria-label="Elo de estudos"
      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:p-6"
    >
      {/* Aura do tier (sutil, no canto) */}
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
        style={{ backgroundColor: `${color}14` }}
      />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* BRASÃO + ELO */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "relative grid h-[76px] w-[68px] shrink-0 place-items-center transition-all",
              elo.isDecaying && "animate-pulse"
            )}
            style={{
              clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              background: `linear-gradient(160deg, ${color}, ${color}55)`,
              filter: `drop-shadow(0 4px 14px ${color}55)`,
            }}
            aria-hidden
          >
            <div
              className="grid h-[64px] w-[56px] place-items-center bg-card"
              style={{ clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)" }}
            >
              <Icon className="h-6 w-6" style={{ color }} />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black leading-none tracking-tight" style={{ color }}>
                {elo.tier.name}{elo.division ? ` ${elo.division}` : ""}
              </h2>
              <EloInfoPopover />
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-bold tabular-nums text-foreground">{elo.lpInDivision} PDL</span>
              {elo.division ? " na divisão" : " acima do piso"}
            </p>

            {/* bg-none: tira o gradiente padrão p/ a cor do tier aparecer */}
            <Progress
              value={elo.progressPct}
              className="mt-2.5 h-1.5 w-48 max-w-full bg-muted"
              indicatorClassName="bg-none transition-all"
              indicatorStyle={{ backgroundColor: color }}
            />

            {/* Status do dia: ganho · carência · decaimento */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {elo.todayLp > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  <Flame className="h-3 w-3" /> +{elo.todayLp} PDL hoje
                </span>
              )}
              {elo.isDecaying && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
                  <TrendingDown className="h-3 w-3" /> decaindo −{elo.decayPerDay} PDL/dia · {elo.idleDays}d parado
                </span>
              )}
              {!elo.isDecaying && elo.graceLeft > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                  <Hourglass className="h-3 w-3" /> carência: {elo.graceLeft}d antes de decair
                </span>
              )}
              {elo.todayLp === 0 && !elo.isDecaying && elo.graceLeft === 0 && elo.decayPerDay === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  <Shield className="h-3 w-3" /> elo protegido — estude para subir
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Números-chave */}
        <div className="grid grid-cols-3 gap-3 sm:ml-auto sm:gap-6">
          <Stat icon={Clock} label="Tempo total" value={`${totalHours}h`} />
          <Stat icon={Layers} label="Sessões" value={String(totalSessions)} />
          <Stat icon={Sparkles} label="XP" value={totalXP.toLocaleString("pt-BR")} />
        </div>
      </div>
    </section>
  );
}

/** "Como funciona o elo?" — regras num popover, com a escada de tiers. */
function EloInfoPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Como funciona o elo?"
          className="rounded-full p-0.5 text-muted-foreground/50 transition-colors hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 text-xs leading-relaxed">
        <p className="font-bold text-foreground">Fila ranqueada dos estudos</p>
        <ul className="mt-2 space-y-1.5 text-muted-foreground">
          <li>• <strong className="text-foreground">+1 PDL a cada 2 min</strong> de foco (máx. {DAILY_LP_CAP} PDL/dia — consistência vale mais que maratona).</li>
          <li>• Cada divisão pede 100 PDL (IV → I), 4 divisões por tier.</li>
          <li>• Parou de estudar? Você tem <strong className="text-foreground">{GRACE_DAYS} dias de carência</strong>. Depois disso, <strong className="text-rose-500">perde PDL por dia parado</strong>.</li>
          <li>• Como no LoL: <strong className="text-foreground">Ferro a Prata não decaem</strong> — quem está começando não é punido.</li>
        </ul>
        <div className="mt-3 flex flex-wrap gap-1">
          {ELO_TIERS.map((t) => (
            <span
              key={t.key}
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{ backgroundColor: `${t.color}1a`, color: t.color }}
              title={t.decayPerDay > 0 ? `decai −${t.decayPerDay} PDL/dia` : "não decai"}
            >
              {t.name}
            </span>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:items-end">
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-xl font-bold leading-none tabular-nums">{value}</span>
    </div>
  );
}
