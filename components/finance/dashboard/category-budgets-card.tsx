"use client";

// Tetos por categoria: o complemento fino do Orçamento 75/10/15 — em vez de
// baldes percentuais, um limite em R$ para categorias específicas ("Delivery",
// "Mercado"...), com barra de progresso do mês e alertas de estouro.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Gauge, Plus, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { useSmartView } from "@/components/finance/smart-view-context";
import { setCategoryBudget } from "@/app/(dashboard)/finance/actions";

export interface CategoryBudgetItem {
  category: string;
  /** Teto mensal definido pelo usuário. */
  budget: number;
  /** Gasto do mês corrente nessa categoria. */
  spent: number;
}

interface CategoryBudgetsCardProps {
  items: CategoryBudgetItem[];
  /** Categorias recentes do extrato ainda sem teto (sugestões do formulário). */
  options: string[];
}

function parseValue(raw: string): number | null {
  const n = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

export function CategoryBudgetsCard({ items, options }: CategoryBudgetsCardProps) {
  const router = useRouter();
  const fmt = useFormatCurrency();
  const { smartView: hidden } = useSmartView();

  const [adding, setAdding] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newValue, setNewValue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busy, setBusy] = useState(false);

  const money = (v: number) => (hidden ? "•••••" : fmt(v));

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.spent / b.budget - a.spent / a.budget),
    [items],
  );
  const overCount = sorted.filter((i) => i.spent > i.budget).length;

  const save = async (category: string, value: number | null) => {
    setBusy(true);
    const res = await setCategoryBudget(category, value);
    setBusy(false);
    if (res.success) {
      toast.success(res.message);
      setAdding(false);
      setEditing(null);
      setNewCategory("");
      setNewValue("");
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  const submitNew = () => {
    const value = parseValue(newValue);
    if (!newCategory.trim() || value === null) {
      toast.error("Escolha a categoria e um teto maior que zero.");
      return;
    }
    void save(newCategory, value);
  };

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-1.5">
            <Gauge className="h-3.5 w-3.5 text-primary" />
          </span>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground">Tetos por categoria</h4>
            <p className="text-[10px] text-muted-foreground">
              Limite mensal em valor para as categorias que mais fogem do controle.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {overCount > 0 && (
            <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-500">
              {overCount} estourado{overCount > 1 ? "s" : ""}
            </span>
          )}
          <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs" onClick={() => setAdding((v) => !v)}>
            <Plus className="h-3.5 w-3.5" /> Teto
          </Button>
        </div>
      </div>

      {adding && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-3 animate-in fade-in slide-in-from-top-1">
          <Input
            list="budget-category-options"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Categoria (ex.: Delivery)"
            className="h-9 flex-1 min-w-[140px] text-sm"
            maxLength={60}
          />
          <datalist id="budget-category-options">
            {options.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            inputMode="decimal"
            placeholder="Teto mensal (ex.: 400)"
            className="h-9 w-36 text-sm font-mono"
            onKeyDown={(e) => e.key === "Enter" && submitNew()}
          />
          <Button size="sm" className="h-9 gap-1.5 rounded-lg" onClick={submitNew} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Salvar
          </Button>
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-4 text-xs text-muted-foreground">
          Nenhum teto definido. Escolha uma categoria do seu extrato (ex.: Delivery, Mercado) e
          defina um limite — a barra acompanha o gasto do mês automaticamente.
        </p>
      ) : (
        <div className="space-y-4">
          {sorted.map((item) => {
            const ratio = item.budget > 0 ? item.spent / item.budget : 0;
            const over = ratio > 1;
            const warn = !over && ratio >= 0.8;
            const isEditing = editing === item.category;
            return (
              <div key={item.category} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-bold text-foreground">{item.category}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          inputMode="decimal"
                          autoFocus
                          className="h-7 w-28 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const v = parseValue(editValue);
                              if (v !== null) void save(item.category, v);
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                        <button
                          type="button"
                          title="Salvar teto"
                          disabled={busy}
                          onClick={() => {
                            const v = parseValue(editValue);
                            if (v !== null) void save(item.category, v);
                            else toast.error("Valor inválido.");
                          }}
                          className="rounded-lg p-1 text-emerald-500 hover:bg-emerald-500/10"
                        >
                          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        </button>
                        <button type="button" title="Cancelar" onClick={() => setEditing(null)} className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <p className={cn("text-xs font-bold tabular-nums", over ? "text-rose-500" : "text-foreground")}>
                          {money(item.spent)} <span className="font-medium text-muted-foreground">/ {money(item.budget)}</span>
                        </p>
                        <button
                          type="button"
                          title="Editar teto"
                          onClick={() => { setEditing(item.category); setEditValue(String(item.budget).replace(".", ",")); }}
                          className="rounded-lg p-1 text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          title="Remover teto"
                          disabled={busy}
                          onClick={() => void save(item.category, null)}
                          className="rounded-lg p-1 text-muted-foreground/60 hover:bg-rose-500/10 hover:text-rose-500"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      over ? "bg-rose-500" : warn ? "bg-amber-500" : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                  />
                </div>
                <p className={cn("text-[10px] font-semibold", over ? "text-rose-500" : warn ? "text-amber-600" : "text-muted-foreground")}>
                  {over
                    ? `${money(item.spent - item.budget)} acima do teto`
                    : `${money(Math.max(item.budget - item.spent, 0))} disponíveis até o fim do mês`}
                  {warn && " — atenção, já passou de 80%"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
