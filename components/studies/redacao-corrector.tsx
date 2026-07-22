"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { PenLine, Sparkles, Loader2, Trophy, CheckCircle2, AlertCircle, Save, Info } from "lucide-react";
import { gradeEnemEssay, type EssayGrade } from "@/app/(dashboard)/studies/actions";
import { createBlankNote } from "@/app/(dashboard)/notes/actions";

const COMP_LABELS = [
  "C1 · Norma culta",
  "C2 · Tema & repertório",
  "C3 · Argumentação",
  "C4 · Coesão",
  "C5 · Proposta de intervenção",
];

function scoreColor(score: number): string {
  if (score >= 160) return "text-emerald-500";
  if (score >= 100) return "text-amber-500";
  return "text-rose-500";
}

function totalColor(total: number): string {
  if (total >= 800) return "text-emerald-500";
  if (total >= 600) return "text-amber-500";
  return "text-rose-500";
}

export function RedacaoCorrector() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [text, setText] = useState("");
  const [grade, setGrade] = useState<EssayGrade | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text.length;
    // Estimativa de linhas manuscritas do ENEM (~70 caracteres por linha).
    const estLines = Math.max(text.split("\n").filter((l) => l.trim()).length, Math.ceil(chars / 70));
    return { words, chars, estLines };
  }, [text]);

  const handleGrade = async () => {
    if (text.trim().length < 200) {
      toast.error("Escreva a redação completa antes de corrigir (mín. ~200 caracteres).");
      return;
    }
    setLoading(true);
    setGrade(null);
    try {
      const res = await gradeEnemEssay({ theme, text });
      if (res.success && res.grade) {
        setGrade(res.grade);
        if (!res.grade.aiGraded) toast.info(res.message);
        else toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Erro ao corrigir a redação.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsNote = async () => {
    setSaving(true);
    try {
      const title = theme.trim() ? `Redação: ${theme.trim().slice(0, 80)}` : "Redação";
      let content = theme.trim() ? `**Tema:** ${theme.trim()}\n\n` : "";
      content += text;
      if (grade) {
        content += `\n\n---\n\n## 📊 Correção (${grade.aiGraded ? "IA" : "análise local"}) — ${grade.total}/1000\n`;
        grade.competencies.forEach((c, i) => {
          content += `\n**${COMP_LABELS[i]}: ${c.score}/200** — ${c.feedback}`;
        });
        if (grade.strengths.length) content += `\n\n### ✅ Pontos fortes\n${grade.strengths.map((s) => `- ${s}`).join("\n")}`;
        if (grade.improvements.length) content += `\n\n### 🔧 A melhorar\n${grade.improvements.map((s) => `- ${s}`).join("\n")}`;
        if (grade.summary) content += `\n\n> ${grade.summary}`;
      }
      const res = await createBlankNote({ title, content });
      if (res.success && res.id) {
        toast.success("Redação salva nas Notas.");
        router.push(`/notes/${res.id}`);
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Falha ao salvar a redação.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ESQUERDA: editor */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="rounded-lg bg-primary/10 p-1.5 text-primary"><PenLine className="h-4 w-4" /></div>
            Sua redação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground">Tema da redação</Label>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex.: Desafios para a valorização de comunidades tradicionais no Brasil" className="h-10" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">Texto dissertativo-argumentativo</Label>
              <span className={cn("text-[11px] tabular-nums", stats.estLines > 30 ? "text-rose-500" : "text-muted-foreground")}>
                {stats.words} palavras · ~{stats.estLines} linhas
              </span>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escreva ou cole sua redação aqui. Estruture em 4 parágrafos: introdução, dois de desenvolvimento e conclusão com proposta de intervenção…"
              className="min-h-[340px] resize-y bg-muted/20 text-sm leading-relaxed"
            />
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" /> O ENEM espera de 7 a 30 linhas. Ideal: ~25–30 linhas em 4 parágrafos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleGrade} disabled={loading} className="flex-1 gap-2 font-semibold">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Corrigindo…" : "Corrigir com IA"}
            </Button>
            <Button onClick={handleSaveAsNote} disabled={saving || !text.trim()} variant="outline" className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar nas Notas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DIREITA: resultado */}
      <Card className="border-border/50 bg-card shadow-sm">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-600"><Trophy className="h-4 w-4" /></div>
            Correção (5 competências)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {!grade ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <div className="mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-muted"><Trophy className="h-7 w-7 opacity-40" /></div>
              <p className="text-sm">Escreva sua redação e clique em <b>Corrigir com IA</b> para receber a nota nas 5 competências do ENEM (0–1000).</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Nota total */}
              <div className="rounded-2xl border border-border/40 bg-muted/20 p-5 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nota total</p>
                <p className={cn("text-5xl font-black tabular-nums", totalColor(grade.total))}>{grade.total}</p>
                <p className="text-xs text-muted-foreground">de 1000{!grade.aiGraded && " · análise estrutural (sem IA)"}</p>
              </div>

              {/* Competências */}
              <div className="space-y-3">
                {grade.competencies.map((c, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">{COMP_LABELS[i]}</span>
                      <span className={cn("font-bold tabular-nums", scoreColor(c.score))}>{c.score}/200</span>
                    </div>
                    <Progress value={(c.score / 200) * 100} className="mt-1 h-1.5" />
                    {c.feedback && <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.feedback}</p>}
                  </div>
                ))}
              </div>

              {grade.strengths.length > 0 && (
                <div className="rounded-xl bg-emerald-500/10 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Pontos fortes</p>
                  <ul className="space-y-0.5 text-[11px] text-emerald-800 dark:text-emerald-200">
                    {grade.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {grade.improvements.length > 0 && (
                <div className="rounded-xl bg-amber-500/10 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400"><AlertCircle className="h-3.5 w-3.5" /> A melhorar</p>
                  <ul className="space-y-0.5 text-[11px] text-amber-800 dark:text-amber-200">
                    {grade.improvements.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {grade.summary && (
                <p className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs italic leading-relaxed text-muted-foreground">{grade.summary}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
