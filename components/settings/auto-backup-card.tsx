"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CalendarClock, FolderOpen, Loader2, PlayCircle, Save } from "lucide-react";
import { updateAutoBackupSettings, runAutoBackupNow } from "@/app/(dashboard)/settings/actions";
import type { AutoBackupStatus } from "@/lib/auto-backup";

export function AutoBackupCard({ initial }: { initial: AutoBackupStatus }) {
    const [status, setStatus] = useState(initial);
    const [dir, setDir] = useState(initial.dir);
    const [keep, setKeep] = useState(initial.keep);
    const [isSaving, setIsSaving] = useState(false);
    const [isRunning, setIsRunning] = useState(false);

    const dirty = dir !== status.dir || keep !== status.keep;

    const handleToggle = async (enabled: boolean) => {
        setStatus((s) => ({ ...s, enabled }));
        try {
            const next = await updateAutoBackupSettings({ enabled });
            setStatus(next);
            toast.success(enabled ? "Backup automático ativado." : "Backup automático desativado.");
        } catch {
            setStatus((s) => ({ ...s, enabled: !enabled }));
            toast.error("Não foi possível salvar a preferência.");
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const next = await updateAutoBackupSettings({ dir, keep });
            setStatus(next);
            setDir(next.dir);
            setKeep(next.keep);
            toast.success("Configuração de backup salva.");
        } catch {
            toast.error("Não foi possível salvar a configuração.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleRunNow = async () => {
        setIsRunning(true);
        try {
            const res = await runAutoBackupNow();
            if (res.success) toast.success(res.message);
            else toast.error(res.message);
            const next = await updateAutoBackupSettings({});
            setStatus(next);
        } catch {
            toast.error("Falha ao gerar o backup.");
        } finally {
            setIsRunning(false);
        }
    };

    if (!status.supported) {
        return (
            <Card className="border-border shadow-sm bg-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-primary" /> Backup Automático
                    </CardTitle>
                    <CardDescription>
                        Indisponível neste ambiente (nuvem/serverless) — o arquivo viveria num
                        disco efêmero. No seu computador ele roda todos os dias.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card className="border-border shadow-sm bg-card">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CalendarClock className="h-4 w-4 text-primary" /> Backup Automático
                            {status.enabled ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none">Ativo · diário</Badge>
                            ) : (
                                <Badge className="bg-muted text-muted-foreground border-none">Desligado</Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Snapshot do banco + export JSON completo, 1× por dia, mantendo as
                            últimas {status.keep} cópias. Aponte para uma pasta do OneDrive/Drive
                            para ter cópia fora do PC.
                        </CardDescription>
                    </div>
                    <Switch checked={status.enabled} onCheckedChange={handleToggle} />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-[1fr_110px]">
                    <div className="space-y-1.5">
                        <Label htmlFor="auto-backup-dir" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Pasta de destino
                        </Label>
                        <div className="relative">
                            <FolderOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="auto-backup-dir"
                                value={dir}
                                onChange={(e) => setDir(e.target.value)}
                                className="pl-8 font-mono text-xs"
                                placeholder="C:\\Users\\voce\\OneDrive\\LifeOS-Backups"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="auto-backup-keep" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Manter cópias
                        </Label>
                        <Input
                            id="auto-backup-keep"
                            type="number"
                            min={1}
                            max={60}
                            value={keep}
                            onChange={(e) => setKeep(Math.max(1, Math.min(60, Number(e.target.value) || 7)))}
                        />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                        {status.lastRunAt
                            ? `Último backup: ${new Date(status.lastRunAt).toLocaleString("pt-BR")} (${status.lastFile ?? ""})`
                            : "Nenhum backup automático ainda — o primeiro roda no próximo uso do app."}
                    </p>
                    <div className="flex gap-2 shrink-0">
                        {dirty && (
                            <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-1.5">
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Salvar
                            </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={handleRunNow} disabled={isRunning} className="gap-1.5">
                            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                            Fazer backup agora
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
