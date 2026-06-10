"use client";

// Automações agendadas da IA (Configurações → Inteligência Artificial).
// "Toda sexta às 8h me mande o resumo financeiro" → vira notificação com link
// para aprofundar no chat. O runner roda junto dos lembretes do sistema.

import { useState } from "react";
import { CalendarClock, Plus, Trash2, Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  createAiAutomation, toggleAiAutomation, deleteAiAutomation, type AiAutomationItem,
} from "@/app/(dashboard)/settings/actions/ai-automations";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function scheduleLabel(schedule: string, hour: number): string {
  const [kind, arg] = schedule.split(":");
  const h = `${String(hour).padStart(2, "0")}h`;
  if (kind === "DAILY") return `Todo dia às ${h}`;
  if (kind === "WEEKLY") return `Toda ${WEEKDAYS[Number(arg)] ?? "semana"} às ${h}`;
  if (kind === "MONTHLY") return `Todo dia ${arg} do mês às ${h}`;
  return schedule;
}

export function AiAutomationsCard({ initialAutomations }: { initialAutomations: AiAutomationItem[] }) {
  const [items, setItems] = useState<AiAutomationItem[]>(initialAutomations);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Formulário de criação
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [kind, setKind] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [weekday, setWeekday] = useState(5);
  const [monthday, setMonthday] = useState(1);
  const [hour, setHour] = useState(8);

  const create = async () => {
    if (busy) return;
    const schedule = kind === "DAILY" ? "DAILY" : kind === "WEEKLY" ? `WEEKLY:${weekday}` : `MONTHLY:${monthday}`;
    setBusy(true);
    try {
      const r = await createAiAutomation({ title, prompt, schedule, hour });
      if (r.success && r.automation) {
        setItems((prev) => [...prev, r.automation!]);
        setTitle(""); setPrompt(""); setOpen(false);
        toast.success("Automação criada — roda na próxima janela agendada.");
      } else {
        toast.error(r.error || "Não foi possível criar.");
      }
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string, enabled: boolean) => {
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
    const r = await toggleAiAutomation(id, enabled);
    if (!r.success) setItems((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a)));
  };

  const remove = async (id: string) => {
    const snapshot = items;
    setItems((prev) => prev.filter((a) => a.id !== id));
    const r = await deleteAiAutomation(id);
    if (!r.success) { setItems(snapshot); toast.error("Não foi possível apagar."); }
  };

  const selectCls = "h-9 rounded-lg border border-border/60 bg-background px-2 text-sm text-foreground";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Automações da IA</p>
            <p className="text-xs text-muted-foreground">
              Pedidos recorrentes (&quot;toda sexta, resumo financeiro&quot;) que viram notificação.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-3.5 w-3.5" /> Nova
        </Button>
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-border/50 bg-muted/20 p-4 animate-in fade-in slide-in-from-top-1">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome (ex.: Resumo financeiro da semana)" maxLength={60} className="text-sm" />
          <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="O que pedir à IA (ex.: Resuma meus gastos da semana e o saldo)" maxLength={500} className="text-sm" />
          <div className="flex flex-wrap items-center gap-2">
            <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={selectCls} aria-label="Frequência">
              <option value="DAILY">Todo dia</option>
              <option value="WEEKLY">Semanal</option>
              <option value="MONTHLY">Mensal</option>
            </select>
            {kind === "WEEKLY" && (
              <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={selectCls} aria-label="Dia da semana">
                {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            )}
            {kind === "MONTHLY" && (
              <select value={monthday} onChange={(e) => setMonthday(Number(e.target.value))} className={selectCls} aria-label="Dia do mês">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>dia {d}</option>)}
              </select>
            )}
            <select value={hour} onChange={(e) => setHour(Number(e.target.value))} className={selectCls} aria-label="A partir de que hora">
              {Array.from({ length: 24 }, (_, i) => i).map((h) => <option key={h} value={h}>{String(h).padStart(2, "0")}h</option>)}
            </select>
            <Button onClick={() => void create()} disabled={busy || !title.trim() || !prompt.trim()} size="sm" className="ml-auto gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Criar
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground/70">
            A automação roda quando o Life OS está aberto (a partir do horário escolhido) e o resultado chega no sino de notificações.
          </p>
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          Nenhuma automação ainda. Crie a primeira — ex.: &quot;toda sexta, meu resumo financeiro&quot;.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/60 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground/90">{a.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <Power className={a.enabled ? "h-3 w-3 text-emerald-500" : "h-3 w-3 text-muted-foreground/40"} />
                  {scheduleLabel(a.schedule, a.hour)}
                  {a.lastRunAt && ` · rodou ${new Date(a.lastRunAt).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Switch checked={a.enabled} onCheckedChange={(v) => void toggle(a.id, v)} aria-label="Ativar/desativar" />
                <button
                  type="button"
                  onClick={() => void remove(a.id)}
                  title="Apagar automação"
                  className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
