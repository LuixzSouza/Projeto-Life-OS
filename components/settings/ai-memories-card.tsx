"use client";

// Aba "Memórias da IA" (Configurações → Inteligência Artificial).
// Tudo o que a IA lembra de você, visível e apagável — privacidade em 1º lugar.

import { useState } from "react";
import { Brain, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addAiMemory, deleteAiMemory, clearAiMemories, type AiMemoryItem } from "@/app/(dashboard)/settings/actions/ai-memories";

export function AiMemoriesCard({ initialMemories }: { initialMemories: AiMemoryItem[] }) {
  const [memories, setMemories] = useState<AiMemoryItem[]>(initialMemories);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const add = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    try {
      const r = await addAiMemory(draft);
      if (r.success && r.memory) {
        setMemories((prev) => [r.memory!, ...prev]);
        setDraft("");
        toast.success("Memória salva — a IA vai lembrar disso.");
      } else {
        toast.error(r.error || "Não foi possível salvar.");
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const snapshot = memories;
    setMemories((prev) => prev.filter((m) => m.id !== id));
    const r = await deleteAiMemory(id);
    if (!r.success) {
      setMemories(snapshot);
      toast.error("Não foi possível apagar.");
    }
  };

  const clearAll = async () => {
    setConfirmClear(false);
    const snapshot = memories;
    setMemories([]);
    const r = await clearAiMemories();
    if (r.success) toast.success(`${r.removed} memória(s) apagada(s).`);
    else setMemories(snapshot);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Brain className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Memórias da IA</p>
            <p className="text-xs text-muted-foreground">
              Fatos que a IA lembra entre conversas (&quot;lembre que...&quot;). Você controla tudo aqui.
            </p>
          </div>
        </div>
        {memories.length > 0 && (
          <Button variant="ghost" size="sm" className="text-xs text-rose-500 hover:text-rose-600" onClick={() => setConfirmClear(true)}>
            Apagar todas
          </Button>
        )}
      </div>

      {/* Adicionar manualmente */}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void add(); } }}
          placeholder="Ex.: Prefiro treinar à noite; sou alérgico a camarão..."
          maxLength={280}
          className="text-sm"
        />
        <Button onClick={() => void add()} disabled={busy || !draft.trim()} size="icon" className="shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Lista */}
      {memories.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-xs text-muted-foreground">
          Nenhuma memória ainda. Diga &quot;lembre que...&quot; no chat, ou adicione acima.
        </p>
      ) : (
        <ul className="space-y-2">
          {memories.map((m) => (
            <li
              key={m.id}
              className="group flex items-start justify-between gap-3 rounded-xl border border-border/40 bg-background/60 px-3.5 py-2.5 transition-colors hover:border-primary/30"
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground/90">{m.content}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  desde {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(m.id)}
                title="Apagar esta memória"
                className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar todas as memórias?</AlertDialogTitle>
            <AlertDialogDescription>
              A IA vai esquecer os {memories.length} fato(s) salvos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearAll()} className="bg-rose-600 text-white hover:bg-rose-700">
              Apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
