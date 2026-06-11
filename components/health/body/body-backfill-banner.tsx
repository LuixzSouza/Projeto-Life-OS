"use client";

// Aviso de snapshots corporais degenerados (height=0 / gender "N/A", criados
// por versões antigas do registro de peso via IA). Aparece só quando existem
// e some após a correção — 1 clique herda os dados dos snapshots vizinhos.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { backfillBodySnapshots } from "@/app/(dashboard)/health/actions";

export function BodyBackfillBanner({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (count <= 0 || done) return null;

  const handleFix = async () => {
    setBusy(true);
    const res = await backfillBodySnapshots();
    setBusy(false);
    if (res.success) {
      toast.success(res.message);
      setDone(true);
      router.refresh();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <p className="text-xs text-muted-foreground min-w-0">
        <span className="font-semibold text-foreground">
          {count} registro{count > 1 ? "s" : ""} antigo{count > 1 ? "s" : ""} sem altura/gênero
        </span>{" "}
        (peso anotado pela IA em versões antigas) — dá para completar com os dados das medições vizinhas.
      </p>
      <Button variant="outline" size="sm" onClick={handleFix} disabled={busy} className="h-8 gap-1.5 rounded-lg text-xs shrink-0">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5 text-amber-500" />}
        Corrigir registros
      </Button>
    </div>
  );
}
