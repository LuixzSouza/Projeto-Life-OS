"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { generateDeckCardsWithAi } from "@/app/(dashboard)/flashcards/actions";
import { cn } from "@/lib/utils";

const COUNTS = [5, 8, 12] as const;

/**
 * Gerador de cartões por IA na tela de edição do baralho. Tira a fricção de
 * criar cartão a cartão: digite um tema ("verbos irregulares") OU cole um
 * resumo/aula, e a IA devolve perguntas e respostas já na fila de revisão.
 * Reusa o mesmo motor da geração a partir de notas (lib/ai-creative.ts).
 */
export function AiDeckGenerator({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [count, setCount] = useState<number>(8);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (loading) return;
    const text = source.trim();
    if (text.length < 12) {
      toast.error("Descreva o tema ou cole um texto (mín. ~12 caracteres).");
      return;
    }
    setLoading(true);
    try {
      const res = await generateDeckCardsWithAi(deckId, text, count);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setSource("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent shadow-sm">
      <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
      <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Gerar com IA
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-6">
        <div className="space-y-2">
          <Label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Tema ou texto
          </Label>
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={loading}
            placeholder="Ex.: 'Verbos irregulares em inglês' — ou cole um resumo/aula para virar cartões."
            className="min-h-[110px] resize-none border-border/60 bg-background leading-relaxed focus:ring-primary/20"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">Quantos cartões?</span>
          <div className="flex gap-1.5">
            {COUNTS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={loading}
                onClick={() => setCount(c)}
                className={cn(
                  "h-8 w-10 rounded-lg border text-sm font-bold transition-all",
                  count === c
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2 font-semibold shadow-sm">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Gerando cartões…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Gerar cartões
            </>
          )}
        </Button>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          A IA cria perguntas e respostas e já coloca tudo na fila de revisão. Revise e edite depois se quiser.
        </p>
      </CardContent>
    </Card>
  );
}
