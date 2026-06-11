"use client";

// Seletor de matéria COM BUSCA (Popover + Command): o <Select> simples vira um
// funil quando a pessoa tem dezenas de tópicos — aqui digita 2 letras e achou.
// Agrupa raiz → filhos, mostra cor/ícone e o tempo já focado (quando houver).

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, BookOpen, FolderTree, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface ComboSubject {
  id: string;
  title: string;
  icon?: string | null;
  color?: string | null;
  parentId?: string | null;
  totalMinutes?: number;
}

interface SubjectComboboxProps {
  subjects: ComboSubject[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Atalho: opção "Raiz principal" (valor "root") — formulário de tópicos. */
  allowRoot?: boolean;
  /** Opção "vazia" customizada (ex.: { value: "none", label: "Nenhuma" }). */
  emptyOption?: { value: string; label: string };
  className?: string;
}

const fmtMin = (m?: number) => {
  if (!m || m <= 0) return null;
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h${m % 60 > 0 ? ` ${m % 60}m` : ""}` : `${m}m`;
};

export function SubjectCombobox({
  subjects,
  value,
  onChange,
  placeholder = "Selecione um tópico ou matéria",
  allowRoot = false,
  emptyOption,
  className,
}: SubjectComboboxProps) {
  const [open, setOpen] = useState(false);
  // allowRoot é açúcar para a opção vazia clássica do formulário de tópicos.
  const empty = emptyOption ?? (allowRoot ? { value: "root", label: "Raiz principal" } : null);

  // Raiz → filhos (filhos órfãos viram um grupo "Outros" para nunca sumirem).
  const groups = useMemo(() => {
    const roots = subjects.filter((s) => !s.parentId);
    const byParent = new Map<string, ComboSubject[]>();
    const orphans: ComboSubject[] = [];
    for (const s of subjects) {
      if (!s.parentId) continue;
      if (subjects.some((p) => p.id === s.parentId)) {
        byParent.set(s.parentId, [...(byParent.get(s.parentId) ?? []), s]);
      } else {
        orphans.push(s);
      }
    }
    return { roots, byParent, orphans };
  }, [subjects]);

  const selected = value && value !== empty?.value ? subjects.find((s) => s.id === value) : null;

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  const Row = ({ s, child }: { s: ComboSubject; child?: boolean }) => {
    const time = fmtMin(s.totalMinutes);
    return (
      <CommandItem
        // value = texto pesquisável (cmdk filtra por ele); id no fim evita colisão
        value={`${s.title} ${s.id}`}
        onSelect={() => pick(s.id)}
        className="gap-2"
      >
        {child && <CornerDownRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />}
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm"
          style={{ backgroundColor: `${s.color || "#6366f1"}1a`, color: s.color || "#6366f1" }}
        >
          {s.icon || <BookOpen className="h-3 w-3" />}
        </span>
        <span className="min-w-0 flex-1 truncate">{s.title}</span>
        {time && <span className="shrink-0 text-[10px] font-bold tabular-nums text-muted-foreground/60">{time}</span>}
        <Check className={cn("h-4 w-4 shrink-0", value === s.id ? "opacity-100 text-primary" : "opacity-0")} />
      </CommandItem>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm"
                style={{ backgroundColor: `${selected.color || "#6366f1"}1a`, color: selected.color || "#6366f1" }}
              >
                {selected.icon || <BookOpen className="h-3 w-3" />}
              </span>
              <span className="truncate font-semibold">{selected.title}</span>
            </span>
          ) : empty && value === empty.value ? (
            <span className="flex items-center gap-2 font-semibold text-primary">
              <FolderTree className="h-4 w-4" /> {empty.label}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-0">
        <Command>
          <CommandInput placeholder="Digite para buscar…" />
          <CommandList className="max-h-72">
            <CommandEmpty>Nenhuma matéria encontrada.</CommandEmpty>

            {empty && (
              <CommandGroup>
                <CommandItem value={`${empty.label} ${empty.value}`} onSelect={() => pick(empty.value)} className="gap-2 font-semibold text-primary">
                  <FolderTree className="h-4 w-4" /> {empty.label}
                  <Check className={cn("ml-auto h-4 w-4", value === empty.value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              </CommandGroup>
            )}

            {groups.roots.map((root) => {
              const children = groups.byParent.get(root.id) ?? [];
              return (
                <CommandGroup key={root.id}>
                  <Row s={root} />
                  {children.map((c) => <Row key={c.id} s={c} child />)}
                </CommandGroup>
              );
            })}

            {groups.orphans.length > 0 && (
              <CommandGroup heading="Outros">
                {groups.orphans.map((s) => <Row key={s.id} s={s} />)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
