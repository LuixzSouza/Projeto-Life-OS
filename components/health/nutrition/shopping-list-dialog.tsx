"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ShoppingCart, Copy, Check, Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { MealPlanSlot } from "./weekly-planner-types";
import { buildShoppingList, fmtQty, emojiForFood } from "./meal-plan-utils";

export function ShoppingListDialog({ plan }: { plan: MealPlanSlot[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const list = useMemo(() => buildShoppingList(plan), [plan]);

  const toggle = (name: string) =>
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const handleCopy = async () => {
    const text = list.map(i => `• ${fmtQty(i.amount)}x ${i.name}`).join("\n");
    try {
      await navigator.clipboard.writeText(`Lista de Compras — Cardápio Semanal\n\n${text}`);
      setCopied(true);
      toast.success("Lista copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar a lista.");
    }
  };

  const remaining = list.length - checked.size;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setChecked(new Set()); }}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          <span>Lista de Compras</span>
        </Button>
      </DialogTrigger>

      <DialogContent size="md" className="p-0 gap-0">
        <DialogHeader
          icon={<ShoppingCart />}
          title="Lista de Compras"
          description={
            list.length > 0
              ? `${list.length} ${list.length === 1 ? "item" : "itens"} consolidados de todo o cardápio da semana.`
              : "Planeje refeições para gerar sua lista de compras automaticamente."
          }
        />

        <DialogBody className="space-y-2">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">Sua lista está vazia</p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione alimentos aos slots do planejador para montá-la.
              </p>
            </div>
          ) : (
            list.map((item) => {
              const isChecked = checked.has(item.name);
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => toggle(item.name)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all",
                    isChecked
                      ? "border-border/40 bg-muted/30 opacity-60"
                      : "border-border/50 bg-card hover:border-primary/30 hover:bg-muted/20"
                  )}
                >
                  <span
                    className={cn(
                      "h-5 w-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                      isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                    )}
                  >
                    {isChecked && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-lg shrink-0">{emojiForFood(item.name)}</span>
                  <span className={cn("flex-1 text-sm font-medium truncate", isChecked && "line-through")}>
                    {item.name}
                  </span>
                  <span className="text-xs font-bold font-mono bg-primary/10 text-primary px-2 py-1 rounded-md shrink-0">
                    {fmtQty(item.amount)}x
                  </span>
                </button>
              );
            })
          )}
        </DialogBody>

        {list.length > 0 && (
          <DialogFooter className="sm:justify-between">
            <p className="text-xs text-muted-foreground self-center">
              {remaining > 0 ? `${remaining} restante${remaining !== 1 ? "s" : ""}` : "Tudo no carrinho! 🎉"}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado!" : "Copiar lista"}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
