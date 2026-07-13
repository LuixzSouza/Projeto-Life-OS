"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Plus, Check, Dumbbell, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogBody } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EXERCISES_BY_GROUP, MUSCLE_GROUPS } from "../exercise-db";
import { ExerciseThumb } from "./exercise-thumb";

// Seletor de exercícios RICO (busca + filtro por músculo + imagem de demonstração),
// reutilizado para ADICIONAR e TROCAR exercício durante a sessão ao vivo — no lugar
// do campo de texto cru, que exigia digitar o nome exato no meio do treino.

const ALL_EXERCISES: { name: string; group: string }[] = Object.entries(EXERCISES_BY_GROUP)
  .flatMap(([group, names]) => names.map((name) => ({ name, group })));

const GROUP_LABEL: Record<string, string> = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.value, g.label]));
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

interface ExerciseItem { name: string; group: string }

export function ExercisePicker({
  open, onOpenChange, groups = [], existingNames, multiple = false, title, onPick,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Grupos da sessão — priorizados no filtro inicial. */
  groups?: string[];
  /** Nomes já no treino (minúsculo) — marcados como adicionados. */
  existingNames?: Set<string>;
  /** true = mantém aberto pra adicionar vários; false = fecha ao escolher (trocar). */
  multiple?: boolean;
  title?: string;
  onPick: (name: string, group?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null); // null = grupos da sessão (ou todos)
  const [added, setAdded] = useState<Set<string>>(new Set());

  const q = normalize(query.trim());

  // Grupos a exibir ao navegar (sem busca): filtro escolhido → grupos da sessão → todos.
  const browseGroups = useMemo(() => {
    if (filter) return [filter];
    if (groups.length) return groups;
    return MUSCLE_GROUPS.map((g) => g.value);
  }, [filter, groups]);

  const browse = useMemo(() => {
    return browseGroups
      .map((g) => ({ group: g, items: EXERCISES_BY_GROUP[g] ?? [] }))
      .filter((x) => x.items.length > 0);
  }, [browseGroups]);

  const searchResults = useMemo<ExerciseItem[]>(() => {
    if (q.length < 1) return [];
    return ALL_EXERCISES.filter((e) => normalize(e.name).includes(q)).slice(0, 60);
  }, [q]);

  const hasExact = q.length >= 2 && ALL_EXERCISES.some((e) => normalize(e.name) === q);
  const canCustom = q.length >= 2 && !hasExact;

  const isAdded = (name: string) => added.has(name.toLowerCase()) || !!existingNames?.has(name.toLowerCase());

  const pick = (name: string, group?: string) => {
    const clean = name.trim();
    if (!clean) return;
    onPick(clean, group);
    if (multiple) {
      setAdded((prev) => new Set(prev).add(clean.toLowerCase()));
      toast.success(`Adicionado: ${clean} 💪`);
      setQuery("");
    } else {
      onOpenChange(false);
    }
  };

  // Chips de filtro: "Todos" + grupos (os da sessão primeiro).
  const chipGroups = useMemo(() => {
    const ordered = [...MUSCLE_GROUPS].sort((a, b) => {
      const ai = groups.includes(a.value) ? 0 : 1;
      const bi = groups.includes(b.value) ? 0 : 1;
      return ai - bi;
    });
    return ordered;
  }, [groups]);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setQuery(""); setFilter(null); setAdded(new Set()); } }}>
      <DialogContent size="md" className="max-h-[85vh]">
        <DialogHeader
          icon={<Dumbbell />}
          title={title ?? (multiple ? "Adicionar exercício" : "Trocar exercício")}
          description={multiple ? "Busque ou toque para incluir — pode adicionar vários." : "Escolha o exercício que vai substituir."}
        />
        <DialogBody className="custom-scrollbar space-y-3">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canCustom) { e.preventDefault(); pick(query.trim()); } }}
              placeholder="Buscar exercício…"
              className="h-11 pl-9"
            />
          </div>

          {/* Adicionar personalizado (quando digita algo fora do catálogo) */}
          {canCustom && (
            <button
              type="button"
              onClick={() => pick(query.trim())}
              className="flex w-full items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-2.5 text-left text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              Adicionar &quot;{query.trim()}&quot; (personalizado)
            </button>
          )}

          {/* Filtro por grupo (só ao navegar, sem busca ativa) */}
          {q.length < 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setFilter(null)}
                className={cn("shrink-0 rounded-full px-3 h-7 text-xs font-medium transition-colors", filter === null ? "bg-foreground text-background" : "bg-muted/50 text-muted-foreground hover:bg-muted")}
              >
                {groups.length ? "Do dia" : "Todos"}
              </button>
              {chipGroups.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setFilter((f) => (f === g.value ? null : g.value))}
                  className={cn(
                    "shrink-0 rounded-full px-3 h-7 text-xs font-medium whitespace-nowrap transition-colors",
                    filter === g.value ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {/* Resultados */}
          {q.length >= 1 ? (
            searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {searchResults.map((e) => (
                  <PickerItem key={e.name} name={e.name} group={e.group} added={isAdded(e.name)} onPick={pick} />
                ))}
              </div>
            ) : !canCustom ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nada encontrado. Digite ao menos 2 letras para adicionar como personalizado.</p>
            ) : null
          ) : (
            <div className="space-y-3">
              {browse.map(({ group, items }) => (
                <div key={group} className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{GROUP_LABEL[group] ?? group}</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {items.map((name) => (
                      <PickerItem key={name} name={name} group={group} added={isAdded(name)} onPick={pick} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogBody>

        {/* Rodapé no modo múltiplo: confirmar (fecha) mostrando quantos entraram */}
        {multiple && (
          <div className="flex items-center justify-between gap-3 border-t border-border/40 px-5 py-3 sm:px-8">
            <span className="text-xs text-muted-foreground">
              {added.size > 0 ? `${added.size} adicionado${added.size > 1 ? "s" : ""}` : "Toque nos exercícios para incluir"}
            </span>
            <Button onClick={() => onOpenChange(false)} className="h-9 gap-1.5 font-semibold">
              <Check className="h-4 w-4" /> Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Item do seletor (nível de módulo — NÃO definir dentro do render, senão a lista
// remonta a cada toque e "engole" o clique no mobile).
function PickerItem({ name, group, added, onPick }: {
  name: string;
  group: string;
  added: boolean;
  onPick: (name: string, group?: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(name, group)}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all active:scale-[0.98]",
        added ? "border-primary bg-primary/10" : "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      <ExerciseThumb name={name} group={group} showPlay={false} className="pointer-events-none h-12 w-12 shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">{name}</span>
        <span className="block truncate text-[10px] text-muted-foreground">{GROUP_LABEL[group] ?? group}</span>
      </span>
      <span className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
        added ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground/60",
      )}>
        {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
