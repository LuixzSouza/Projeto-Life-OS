"use client";

// Mapas de Conteúdo (#9): diálogo que lista os temas (tags/matérias com 2+
// notas) e gera/regenera a nota-sumário do tema escolhido em 1 clique.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Map as MapIcon, Loader2, Hash, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { getMapSources, createContentMap, type MapSource } from "@/app/(dashboard)/notes/map-actions";

export function ContentMapDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState<MapSource[] | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, start] = useTransition();

  // Carrega os temas ao ABRIR (no handler, não em effect — evita render em cascata).
  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v) {
      setSources(null);
      getMapSources().then(setSources).catch(() => setSources([]));
    }
  };

  const generate = (s: MapSource) => {
    const key = `${s.kind}:${s.value}`;
    setBusyKey(key);
    start(async () => {
      const res = await createContentMap(s);
      setBusyKey(null);
      if (res.success && res.id) {
        toast.success(res.message);
        setOpen(false);
        router.push(`/notes/${res.id}`);
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
          <MapIcon className="h-3.5 w-3.5" /> Mapa de Conteúdo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-primary" /> Mapa de Conteúdo
          </DialogTitle>
          <DialogDescription>
            Escolha um tema: o mapa vira a nota-sumário dele, com link para cada nota atômica.
            Se o mapa já existir, a lista é regenerada.
          </DialogDescription>
        </DialogHeader>

        {sources === null ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum tema com 2+ notas ainda. Use tags ou matérias nas notas para formar temas.
          </p>
        ) : (
          <div className="max-h-[50vh] space-y-1 overflow-y-auto pr-1">
            {sources.map((s) => {
              const key = `${s.kind}:${s.value}`;
              const Icon = s.kind === "tag" ? Hash : GraduationCap;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={busyKey !== null}
                  onClick={() => generate(s)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-border/40 bg-background px-3 py-2.5 text-left transition-all hover:border-primary/30 hover:bg-muted/40 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{s.label}</span>
                  <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">
                    {s.count} notas
                  </span>
                  {busyKey === key && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
