"use client";

// Ações do header de Notas (#2 — Segundo Cérebro): atalho pro Diário de hoje
// (cria/abre a nota do dia, com streak) e pro Grafo de Conexões.

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookHeart, Network, Loader2, Flame } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { openTodayJournal, getJournalStreak } from "@/app/(dashboard)/notes/journal-actions";
import { ContentMapDialog } from "@/components/notes/content-map-dialog";

// Data resolvida no CLIENTE (regra do projeto: evita o bug de fuso do "dia anterior").
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function NotesHeaderActions() {
  const router = useRouter();
  const [opening, startOpen] = useTransition();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    let alive = true;
    getJournalStreak(todayKey()).then((s) => { if (alive) setStreak(s); });
    return () => { alive = false; };
  }, []);

  const openJournal = () => {
    startOpen(async () => {
      const res = await openTodayJournal(todayKey());
      if (res.success && res.id) router.push(`/notes/${res.id}`);
      else toast.error(res.message);
    });
  };

  return (
    <>
      <ContentMapDialog />
      <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
        <Link href="/notes/graph">
          <Network className="h-3.5 w-3.5" /> Grafo
        </Link>
      </Button>
      <Button onClick={openJournal} disabled={opening} size="sm" className="rounded-xl gap-1.5">
        {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookHeart className="h-3.5 w-3.5" />}
        Diário de hoje
        {streak > 1 && (
          <span className="flex items-center gap-0.5 rounded-md bg-background/20 px-1.5 text-[10px] font-black">
            <Flame className="h-3 w-3" /> {streak}
          </span>
        )}
      </Button>
    </>
  );
}
