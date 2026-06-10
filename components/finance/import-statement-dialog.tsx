"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, FileUp, FileCheck2, ArrowDownCircle, ArrowUpCircle, Info, Sparkles, ClipboardPaste } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";
import { parseStatement, type ParsedTransaction } from "@/lib/statement-parser";
import { importTransactions, parseStatementWithAi } from "@/app/(dashboard)/finance/actions";

interface ImportStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: { id: string; name: string }[];
}

export function ImportStatementDialog({ open, onOpenChange, accounts }: ImportStatementDialogProps) {
  const router = useRouter();
  const formatMoney = useFormatCurrency();
  const fileRef = useRef<HTMLInputElement>(null);

  const [accountId, setAccountId] = useState<string>(accounts[0]?.id ?? "");
  const [mode, setMode] = useState<"file" | "ai">("file");
  const [fileName, setFileName] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedTransaction[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setFileName(""); setAiText(""); setParsed([]); setParseError(null); setMode("file");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setParsed([]);
    setFileName(file.name);
    try {
      const text = await file.text();
      const res = parseStatement(file.name, text);
      if (res.error && res.transactions.length === 0) { setParseError(res.error); return; }
      setParsed(res.transactions);
      if (res.error) toast.message(res.error);
    } catch {
      setParseError("Não foi possível ler o arquivo.");
    }
  };

  // Modo IA: cola o texto do extrato (qualquer banco/app/e-mail) e a IA estrutura.
  const handleAiParse = async () => {
    if (aiText.trim().length < 10) { toast.error("Cole o texto do extrato primeiro."); return; }
    setAiLoading(true);
    setParseError(null);
    setParsed([]);
    try {
      const res = await parseStatementWithAi(aiText);
      if (res.success) {
        setParsed(res.transactions);
        toast.success(res.message);
      } else {
        setParseError(res.message);
      }
    } catch {
      setParseError("Falha ao processar com a IA. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleImport = async () => {
    if (!accountId) { toast.error("Selecione uma conta."); return; }
    if (parsed.length === 0) return;
    setImporting(true);
    try {
      const res = await importTransactions(accountId, parsed);
      if (res.success) {
        toast.success(res.message);
        onOpenChange(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Falha ao importar.");
    } finally {
      setImporting(false);
    }
  };

  const income = parsed.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
  const expense = parsed.filter((t) => t.type === "EXPENSE").reduce((a, t) => a + t.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent size="lg">
        <DialogHeader
          icon={<FileUp />}
          title="Importar extrato"
          description="Todo banco exporta OFX/CSV — ou cole o texto do extrato e deixe a IA estruturar."
        />
        <DialogBody className="space-y-4">
          {/* Conta de destino */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Conta de destino</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Escolha a conta" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Origem: arquivo OFX/CSV ou texto colado lido pela IA */}
          <Tabs value={mode} onValueChange={(v) => { setMode(v as "file" | "ai"); setParsed([]); setParseError(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="file" className="gap-1.5"><FileUp className="h-3.5 w-3.5" /> Arquivo (OFX/CSV)</TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Colar texto (IA)</TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "file" ? (
            <div
              onClick={() => fileRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/50 bg-muted/10 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/20"
            >
              {fileName ? <FileCheck2 className="h-7 w-7 text-emerald-500" /> : <FileUp className="h-7 w-7 text-muted-foreground/60" />}
              <p className="text-sm font-bold text-foreground">{fileName || "Clique para escolher o arquivo"}</p>
              <p className="text-[11px] text-muted-foreground">Formatos: .ofx, .csv — lido no seu navegador, nada vai a terceiros.</p>
              <input
                ref={fileRef}
                type="file"
                accept=".ofx,.csv,.txt,text/csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); }}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder={"Cole aqui o extrato copiado do app do banco, e-mail ou PDF…\n\nEx.:\n05/06 Pix recebido João R$ 250,00\n06/06 Supermercado Carrefour -R$ 187,32"}
                className="h-40 w-full resize-y rounded-xl border border-border/50 bg-muted/10 px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:border-primary/50"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                  <ClipboardPaste className="mt-0.5 h-3 w-3 shrink-0" />
                  O texto vai para o provedor de IA configurado — com Ollama local, nada sai do seu computador.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiParse}
                  disabled={aiLoading || aiText.trim().length < 10}
                  className="h-9 shrink-0 gap-1.5 rounded-xl font-semibold"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiLoading ? "Lendo extrato…" : "Extrair lançamentos"}
                </Button>
              </div>
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400">
              <Info className="h-4 w-4 shrink-0 mt-0.5" /> {parseError}
            </div>
          )}

          {/* Preview */}
          {parsed.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg bg-muted/60 px-3 py-1.5 font-bold">{parsed.length} lançamentos</span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <ArrowUpCircle className="h-4 w-4" /> {formatMoney(income)}
                </span>
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                  <ArrowDownCircle className="h-4 w-4" /> {formatMoney(expense)}
                </span>
              </div>

              <div className="max-h-[260px] overflow-auto rounded-xl border border-border/40 custom-scrollbar">
                <table className="w-full text-sm">
                  <tbody>
                    {parsed.map((t, i) => (
                      <tr key={i} className="border-b border-border/30 last:border-0">
                        <td className="px-3 py-2 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(`${t.date}T12:00:00`).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-3 py-2 text-foreground/90 truncate max-w-[260px]">{t.description}</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-bold whitespace-nowrap", t.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {t.type === "INCOME" ? "+" : "-"}{formatMoney(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground/70">Lançamentos já existentes (mesma data, valor e descrição) são ignorados automaticamente.</p>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={importing || parsed.length === 0 || !accountId}
            className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            {importing ? <Loader2 className="h-5 w-5 animate-spin" /> : `Importar ${parsed.length || ""} lançamento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
