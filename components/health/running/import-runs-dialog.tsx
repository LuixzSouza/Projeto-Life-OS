"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogBody } from "@/components/ui/dialog";
import { Upload, FileUp, Loader2, Footprints, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { parseRunningFile, ParsedRun } from "@/lib/running-import";
import { importRuns } from "@/app/(dashboard)/health/actions";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ImportRunsDialog() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [parsed, setParsed] = useState<ParsedRun[]>([]);
    const [fileName, setFileName] = useState("");
    const [importing, setImporting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const text = await file.text();
            const runs = parseRunningFile(file.name, text);
            if (runs.length === 0) {
                toast.error("Nenhuma corrida encontrada no arquivo.");
                return;
            }
            setParsed(runs);
            setFileName(file.name);
        } catch {
            toast.error("Não foi possível ler o arquivo. Verifique o formato (GPX, TCX ou CSV).");
        }
    };

    const reset = () => {
        setParsed([]);
        setFileName("");
        if (inputRef.current) inputRef.current.value = "";
    };

    const confirm = async () => {
        setImporting(true);
        try {
            const res = await importRuns(parsed);
            if (res.success) {
                toast.success(res.message);
                setOpen(false);
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

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-11 gap-2 rounded-xl font-semibold border-border/60">
                    <Upload className="h-4 w-4" /> Importar arquivo (GPX/TCX/CSV)
                </Button>
            </DialogTrigger>
            <DialogContent size="md">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-primary" /> Importar corridas
                    </DialogTitle>
                    <DialogDescription className="pt-1">
                        Exporte do Strava, Garmin ou seu relógio (GPX, TCX ou CSV) e importe aqui. Tudo fica no seu banco local.
                    </DialogDescription>
                </DialogHeader>

                <DialogBody className="space-y-5">
                    {parsed.length === 0 ? (
                        <label className="flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-colors">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                <Upload className="h-6 w-6" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">Clique para selecionar o arquivo</p>
                            <p className="text-xs text-muted-foreground">.gpx · .tcx · .csv</p>
                            <input ref={inputRef} type="file" accept=".gpx,.tcx,.csv" className="hidden" onChange={handleFile} />
                        </label>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> {parsed.length} corrida(s) · {fileName}
                                </span>
                                <Button variant="ghost" size="sm" onClick={reset} className="h-8 gap-1 text-muted-foreground hover:text-destructive">
                                    <X className="h-3.5 w-3.5" /> Trocar
                                </Button>
                            </div>
                            <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                                {parsed.map((run, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 bg-muted/20 border border-border/40 rounded-xl">
                                        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                            <Footprints className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-foreground truncate">{run.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {format(new Date(run.date), "dd MMM yyyy", { locale: ptBR })}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0 text-xs">
                                            <p className="font-bold text-primary">{run.distanceKm} km</p>
                                            <p className="text-muted-foreground font-mono">{run.paceStr} · {run.durationMin}min</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button onClick={confirm} disabled={importing} className="w-full h-11 rounded-xl font-bold gap-2">
                                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Importar {parsed.length} corrida(s)
                            </Button>
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
