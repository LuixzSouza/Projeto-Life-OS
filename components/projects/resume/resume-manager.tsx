"use client";

// Gerenciador de currículos versionados (Fase 1 do Career OS).
// Grid de versões (Base + variações) com clonar/renomear/excluir e o
// editor (ResumeBuilder) embutido ao escolher uma versão.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    FileText, Plus, Copy, Pencil, Trash2, MoreVertical, BadgeCheck, Loader2, FileDown, Languages,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    ResumeRecord, cloneResume, renameResume, deleteResume,
} from "@/app/(dashboard)/jobs/resume-actions";
import { createTranslatedResume } from "@/app/(dashboard)/jobs/resume-ai-actions";
import { ResumeBuilder } from "./resume-builder";
import { useResumeExport } from "./use-resume-export";

const LOCALE_INFO: Record<string, { flag: string; label: string }> = {
    "pt-BR": { flag: "🇧🇷", label: "Português" },
    "en-US": { flag: "🇺🇸", label: "English" },
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function ResumeManager({ resumes }: { resumes: ResumeRecord[] }) {
    const router = useRouter();
    const { exporting, exportPdf } = useResumeExport();
    const [editing, setEditing] = useState<ResumeRecord | null>(null);

    // Modais globais (nunca dentro do .map) — controladas pelo item selecionado.
    const [renameTarget, setRenameTarget] = useState<ResumeRecord | null>(null);
    const [cloneTarget, setCloneTarget] = useState<ResumeRecord | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ResumeRecord | null>(null);
    const [nameInput, setNameInput] = useState("");
    const [localeInput, setLocaleInput] = useState("pt-BR");
    const [busy, setBusy] = useState(false);
    const [translatingId, setTranslatingId] = useState<string | null>(null);

    // Gera uma NOVA versão com o conteúdo traduzido pela IA (original intacto).
    const handleTranslate = async (r: ResumeRecord, targetLocale: string) => {
        if (translatingId) return;
        setTranslatingId(r.id);
        const tid = toast.loading("Traduzindo currículo com IA — pode levar alguns segundos…");
        try {
            const res = await createTranslatedResume(r.id, targetLocale);
            if (res.success) {
                toast.success("Nova versão traduzida criada! Revise antes de exportar.", { id: tid });
                router.refresh();
            } else {
                toast.error(res.error, { id: tid });
            }
        } catch {
            toast.error("Falha ao traduzir. Tente de novo.", { id: tid });
        } finally {
            setTranslatingId(null);
        }
    };

    const base = resumes.find((r) => r.isBase) ?? resumes[0];

    // --- MODO EDITOR ---
    if (editing) {
        return (
            <div className="bg-white dark:bg-zinc-950 border border-border/40 rounded-[2rem] shadow-sm overflow-hidden p-2">
                <ResumeBuilder
                    resumeId={editing.id}
                    resumeName={editing.name}
                    locale={editing.locale}
                    template={editing.template}
                    initialData={editing.data}
                    onBack={() => { setEditing(null); router.refresh(); }}
                />
            </div>
        );
    }

    // --- AÇÕES ---
    const handleClone = async () => {
        if (!cloneTarget) return;
        setBusy(true);
        const res = await cloneResume(cloneTarget.id, nameInput);
        setBusy(false);
        if (res.success) {
            toast.success("Currículo clonado! Edite a nova versão para focar na vaga.");
            setCloneTarget(null);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleRename = async () => {
        if (!renameTarget) return;
        setBusy(true);
        const res = await renameResume(renameTarget.id, nameInput, localeInput);
        setBusy(false);
        if (res.success) {
            toast.success("Currículo atualizado.");
            setRenameTarget(null);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setBusy(true);
        const res = await deleteResume(deleteTarget.id);
        setBusy(false);
        if (res.success) {
            toast.success("Currículo excluído.");
            setDeleteTarget(null);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Cabeçalho da seção */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Suas versões de currículo
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Mantenha o Base sempre completo e clone versões focadas em cada vaga ou idioma.
                    </p>
                </div>
                <Button
                    className="gap-2 h-10 rounded-xl font-bold shadow-sm shrink-0"
                    onClick={() => {
                        if (!base) return;
                        setNameInput("");
                        setCloneTarget(base);
                    }}
                >
                    <Plus className="h-4 w-4" /> Nova versão
                </Button>
            </div>

            {/* Grid de versões */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
                {resumes.map((r) => {
                    const locale = LOCALE_INFO[r.locale] ?? { flag: "🌐", label: r.locale };
                    const parent = r.parentId ? resumes.find((p) => p.id === r.parentId) : null;
                    return (
                        <Card
                            key={r.id}
                            className={cn(
                                "p-6 flex flex-col gap-5 bg-card border-border/40 shadow-sm hover:shadow-md hover:border-primary/30 transition-all rounded-2xl",
                                r.isBase && "border-primary/30 bg-primary/[0.02]"
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm truncate" title={r.name}>{r.name}</h3>
                                        <p className="text-[11px] text-muted-foreground truncate">
                                            {r.data.hero.name || "Sem identidade preenchida"}
                                        </p>
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Ações do currículo ${r.name}`}
                                            className="h-8 w-8 rounded-lg text-muted-foreground shrink-0"
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuItem
                                            className="gap-2 text-xs cursor-pointer"
                                            onClick={() => setEditing(r)}
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> Editar conteúdo
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 text-xs cursor-pointer"
                                            onClick={() => { setNameInput(""); setCloneTarget(r); }}
                                        >
                                            <Copy className="h-3.5 w-3.5" /> Clonar versão
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 text-xs cursor-pointer"
                                            disabled={translatingId === r.id}
                                            onClick={() => handleTranslate(r, r.locale === "en-US" ? "pt-BR" : "en-US")}
                                        >
                                            {translatingId === r.id
                                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                : <Languages className="h-3.5 w-3.5" />}
                                            {r.locale === "en-US" ? "Versão em português (IA)" : "Versão em inglês (IA)"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 text-xs cursor-pointer"
                                            disabled={exporting}
                                            onClick={() => exportPdf({ data: r.data, name: r.name, locale: r.locale, template: r.template })}
                                        >
                                            <FileDown className="h-3.5 w-3.5" /> Exportar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="gap-2 text-xs cursor-pointer"
                                            onClick={() => { setNameInput(r.name); setLocaleInput(r.locale); setRenameTarget(r); }}
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> Renomear / idioma
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="gap-2 text-xs cursor-pointer text-destructive focus:text-destructive"
                                            disabled={r.isBase}
                                            onClick={() => setDeleteTarget(r)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> {r.isBase ? "Base não pode ser excluído" : "Excluir"}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                {r.isBase && (
                                    <Badge className="bg-primary/10 text-primary border-none gap-1 text-[10px]">
                                        <BadgeCheck className="h-3 w-3" /> Base
                                    </Badge>
                                )}
                                <Badge className="bg-muted text-muted-foreground border-none text-[10px]">
                                    {locale.flag} {locale.label}
                                </Badge>
                                {parent && (
                                    <Badge className="bg-muted text-muted-foreground border-none text-[10px]" title={`Clonado de ${parent.name}`}>
                                        ↳ {parent.name}
                                    </Badge>
                                )}
                            </div>

                            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                                <span className="text-[11px] text-muted-foreground">
                                    Atualizado em {formatDate(r.updatedAt)}
                                </span>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg gap-1.5 text-xs font-semibold border-border/60 hover:bg-primary/5 hover:text-primary"
                                    onClick={() => setEditing(r)}
                                >
                                    <Pencil className="h-3 w-3" /> Editar
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* --- DIALOG: CLONAR --- */}
            <Dialog open={!!cloneTarget} onOpenChange={(open) => { if (!open) setCloneTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Copy className="h-4 w-4 text-primary" /> Clonar “{cloneTarget?.name}”
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                            A cópia é independente: ajuste-a para uma vaga específica sem tocar no original.
                        </p>
                        <div className="space-y-1.5">
                            <Label htmlFor="clone-name">Nome da nova versão</Label>
                            <Input
                                id="clone-name"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                placeholder={`Ex.: Front-end · Empresa X`}
                                onKeyDown={(e) => { if (e.key === "Enter") handleClone(); }}
                            />
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setCloneTarget(null)}>Cancelar</Button>
                        <Button className="rounded-xl gap-2" disabled={busy} onClick={handleClone}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Clonar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- DIALOG: RENOMEAR / IDIOMA --- */}
            <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null); }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <Pencil className="h-4 w-4 text-primary" /> Renomear currículo
                        </DialogTitle>
                    </DialogHeader>
                    <DialogBody className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="rename-name">Nome</Label>
                            <Input
                                id="rename-name"
                                value={nameInput}
                                onChange={(e) => setNameInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Idioma do currículo</Label>
                            <Select value={localeInput} onValueChange={setLocaleInput}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                                    <SelectItem value="en-US">🇺🇸 English (US)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setRenameTarget(null)}>Cancelar</Button>
                        <Button className="rounded-xl gap-2" disabled={busy} onClick={handleRename}>
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />} Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* --- ALERT: EXCLUIR --- */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir “{deleteTarget?.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta versão será removida permanentemente. O Currículo Base e as demais versões não são afetados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={busy}
                            onClick={handleDelete}
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
