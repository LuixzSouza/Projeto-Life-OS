"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Wand2, ImagePlus, X, FileText } from "lucide-react";
import { generateDeckCardsWithAi } from "@/app/(dashboard)/flashcards/actions";
import { cn } from "@/lib/utils";

const COUNTS = [5, 8, 12] as const;
const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 4_500_000; // ~4.5MB em base64, casa com a guarda do servidor

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

/**
 * Gerador de cartões por IA na edição do baralho. Tira a fricção de criar cartão
 * a cartão: digite um tema, cole um resumo E/OU anexe FOTOS (a IA lê a imagem —
 * foto de quadro, página de livro, anotação) e/ou um PDF (texto extraído no
 * navegador). Tudo cai no mesmo motor (lib/ai-creative.ts) e já na fila de
 * revisão.
 */
export function AiDeckGenerator({ deckId }: { deckId: string }) {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [count, setCount] = useState<number>(8);
  const [images, setImages] = useState<string[]>([]);
  const [pdfNote, setPdfNote] = useState<string | null>(null); // "arquivo.pdf · N págs"
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addImages = async (files: File[]) => {
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens.`);
      return;
    }
    const next: string[] = [];
    for (const f of files.slice(0, room)) {
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`"${f.name}" é grande demais (máx. ~4MB).`);
        continue;
      }
      try {
        next.push(await fileToDataUrl(f));
      } catch {
        toast.error(`Falha ao ler "${f.name}".`);
      }
    }
    if (next.length) setImages((prev) => [...prev, ...next]);
  };

  // Extrai texto de um PDF 100% no navegador (pdfjs) — nada sai do dispositivo.
  const addPdf = async (file: File) => {
    setExtracting(true);
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const buf = await file.arrayBuffer();
      const doc = await pdfjs.getDocument({ data: buf }).promise;
      const maxPages = Math.min(doc.numPages, 20);
      let text = "";
      for (let i = 1; i <= maxPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        text +=
          content.items
            .map((it) => (typeof it === "object" && it && "str" in it ? String((it as { str: string }).str) : ""))
            .join(" ") + "\n";
      }
      const clean = text.replace(/\s+/g, " ").trim();
      if (clean.length < 20) {
        toast.error("Não consegui extrair texto desse PDF (pode ser digitalizado/imagem).");
        return;
      }
      setSource((prev) => (prev ? `${prev}\n\n${clean}` : clean));
      setPdfNote(`${file.name} · ${maxPages} pág${maxPages === 1 ? "" : "s"}`);
      toast.success("Texto do PDF adicionado.");
    } catch (err) {
      console.error("Falha ao ler PDF:", err);
      toast.error("Não foi possível ler o PDF.");
    } finally {
      setExtracting(false);
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    const pdfs = files.filter((f) => f.type === "application/pdf");
    if (imgs.length) await addImages(imgs);
    for (const pdf of pdfs) await addPdf(pdf); // 1 por vez (extração é sequencial)
    if (fileRef.current) fileRef.current.value = "";
  };

  const canGenerate = source.trim().length >= 12 || images.length > 0;

  const handleGenerate = async () => {
    if (loading) return;
    if (!canGenerate) {
      toast.error("Descreva um tema, cole um texto ou anexe uma foto/PDF.");
      return;
    }
    setLoading(true);
    try {
      const res = await generateDeckCardsWithAi(deckId, source.trim(), count, images);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message);
      setSource("");
      setImages([]);
      setPdfNote(null);
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
            Tema, texto, foto ou PDF
          </Label>
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            disabled={loading}
            placeholder="Ex.: 'Verbos irregulares em inglês' — cole um resumo, ou anexe uma foto/PDF abaixo."
            className="min-h-[100px] resize-none border-border/60 bg-background leading-relaxed focus:ring-primary/20"
          />
        </div>

        {/* Anexos: fotos + PDF */}
        <div className="space-y-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || extracting}
              onClick={() => fileRef.current?.click()}
              className="gap-2"
            >
              {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              Anexar foto / PDF
            </Button>
            {pdfNote && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" /> {pdfNote}
                <button
                  type="button"
                  onClick={() => setPdfNote(null)}
                  className="text-muted-foreground/60 hover:text-destructive"
                  aria-label="Remover referência do PDF"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>

          {images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-border/60">
                  {/* eslint-disable-next-line @next/next/no-img-element -- preview base64 local */}
                  <img src={src} alt={`Anexo ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-background/90 text-muted-foreground opacity-100 shadow-sm transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Remover imagem"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
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

        <Button onClick={handleGenerate} disabled={loading || extracting || !canGenerate} className="w-full gap-2 font-semibold shadow-sm">
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
          A IA cria perguntas e respostas e já coloca tudo na fila de revisão. Fotos/PDF são processados localmente. Ler fotos exige um modelo com visão (ex.: GPT-4o, Gemini).
        </p>
      </CardContent>
    </Card>
  );
}
