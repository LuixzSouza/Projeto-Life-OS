"use client";

// Detalhamento da vaga com abas. A aba "Currículo Enviado" é o coração da
// rastreabilidade (Fase 3): mostra qual versão foi vinculada e permite baixar o
// PDF EXATO que a empresa recebeu — renderizado a partir do SNAPSHOT congelado,
// nunca do currículo atual.

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Download, Loader2, Lock, MapPin, DollarSign, ExternalLink, Mail,
  CalendarClock, Clock, AlertTriangle, RefreshCw, FileWarning, Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_MAP, getThemeClasses } from "./job-tracker-status";
import { ResumePicker } from "./resume-picker";
import { useResumeExport } from "./resume/use-resume-export";
import type { ResumeRecord } from "@/app/(dashboard)/jobs/resume-actions";
import type { JobWithProject } from "./job-types";
import { attachResumeSnapshot, getJobResumeSnapshot } from "@/app/(dashboard)/projects/actions/job";

const LOCALE_FLAG: Record<string, string> = { "pt-BR": "🇧🇷", "en-US": "🇺🇸" };

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

interface JobDetailDialogProps {
  job: JobWithProject | null;
  resumes: ResumeRecord[];
  onOpenChange: (open: boolean) => void;
}

export function JobDetailDialog({ job, resumes, onOpenChange }: JobDetailDialogProps) {
  const router = useRouter();
  const { exporting, exportPdf } = useResumeExport();
  const [changing, setChanging] = useState(false);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!job) return null;

  const statusInfo = STATUS_MAP[job.status] ?? STATUS_MAP.APPLIED;
  const meta = job.snapshotMeta ?? null;
  // Estado da versão viva vinculada: existe ainda? foi editada após o envio?
  const liveResume = meta ? resumes.find((r) => r.id === meta.resumeId) : undefined;
  const editedSince =
    liveResume && job.snapshotAt ? new Date(liveResume.updatedAt).getTime() > new Date(job.snapshotAt).getTime() : false;

  const startChange = () => {
    const base = resumes.find((r) => r.isBase) ?? resumes[0];
    setSelected(meta?.resumeId && resumes.some((r) => r.id === meta.resumeId) ? meta.resumeId : base?.id ?? "");
    setChanging(true);
  };

  const confirmChange = async () => {
    if (!selected) return;
    setBusy(true);
    const res = await attachResumeSnapshot(job.id, selected, false);
    setBusy(false);
    if (res.success) {
      toast.success("Currículo enviado atualizado — novo snapshot congelado.");
      setChanging(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Falha ao atualizar.");
    }
  };

  // Baixa o PDF EXATO a partir do snapshot (busca o JSON pesado sob demanda).
  const downloadExact = async () => {
    setDownloading(true);
    try {
      const snap = await getJobResumeSnapshot(job.id);
      if (!snap) {
        toast.error("Snapshot indisponível para esta vaga.");
        return;
      }
      await exportPdf({
        data: snap.data,
        name: `${snap.resumeName}-${job.company}`,
        locale: snap.locale,
        template: snap.template,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => { if (!open) { setChanging(false); onOpenChange(false); } }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold tracking-tight">
            {job.company}
            <Badge className={cn("gap-1 border-none text-[10px]", getThemeClasses(statusInfo.theme))}>
              {statusInfo.label}
            </Badge>
          </DialogTitle>
          <DialogDescription>{job.role}</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <Tabs defaultValue="resume" className="w-full">
            <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/40 h-10 w-full">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 h-full">
                Visão geral
              </TabsTrigger>
              <TabsTrigger value="resume" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 flex-1 h-full">
                <FileText className="h-3.5 w-3.5" /> Currículo Enviado
              </TabsTrigger>
            </TabsList>

            {/* ---------- VISÃO GERAL ---------- */}
            <TabsContent value="overview" className="mt-4 space-y-4 focus-visible:outline-none">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {job.location && <Fact icon={MapPin} label="Local" value={job.location} />}
                {job.salary && <Fact icon={DollarSign} label="Faixa" value={job.salary} />}
                <Fact icon={Clock} label="Registrada em" value={fmtDate(job.appliedDate)} />
                {job.followUpDate && <Fact icon={CalendarClock} label="Follow-up" value={fmtDate(job.followUpDate)} />}
                {job.contactEmail && <Fact icon={Mail} label="Contato" value={job.contactName || job.contactEmail} />}
              </div>

              <div className="flex flex-wrap gap-2">
                {job.jobUrl && (
                  <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5">
                    <a href={job.jobUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /> Abrir vaga</a>
                  </Button>
                )}
                {job.contactEmail && (
                  <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5">
                    <a href={`mailto:${job.contactEmail}`}><Mail className="h-3.5 w-3.5" /> E-mail</a>
                  </Button>
                )}
              </div>

              {/* Notas e observações (Markdown) */}
              {job.requirements && job.requirements.trim() && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" /> Notas e observações
                  </h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.requirements}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Timeline do funil (eventos de estágio) */}
              {job.events && job.events.length > 0 && (
                <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Linha do tempo</h4>
                  <div className="space-y-2.5">
                    {job.events.map((e, i) => {
                      const info = STATUS_MAP[e.status] ?? STATUS_MAP.APPLIED;
                      return (
                        <div key={i} className="flex items-center gap-2.5 text-xs">
                          <span className={cn("h-2 w-2 rounded-full shrink-0", getThemeClasses(info.theme).split(" ")[1])} />
                          <span className="font-semibold text-foreground">{info.label}</span>
                          <span className="text-muted-foreground ml-auto">{fmtDate(e.createdAt)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ---------- CURRÍCULO ENVIADO ---------- */}
            <TabsContent value="resume" className="mt-4 space-y-4 focus-visible:outline-none">
              {meta ? (
                <>
                  <div className="rounded-2xl border border-primary/30 bg-primary/[0.03] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{meta.resumeName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {LOCALE_FLAG[meta.locale] ?? "🌐"} {meta.locale} · {meta.template}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none gap-1 text-[10px] shrink-0">
                        <Lock className="h-3 w-3" /> Congelado
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground border-t border-border/40 pt-2.5">
                      <Clock className="h-3 w-3" /> Enviado em <b className="text-foreground">{fmtDate(job.snapshotAt)}</b>
                    </div>

                    {/* Aviso honesto sobre a relação com a versão viva */}
                    {!liveResume ? (
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-600">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        A versão viva foi excluída — mas este snapshot preserva o PDF exato enviado.
                      </p>
                    ) : editedSince ? (
                      <p className="flex items-start gap-1.5 text-[11px] text-amber-600">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        A versão viva foi editada após o envio. O download abaixo entrega o snapshot original, não o atual.
                      </p>
                    ) : (
                      <p className="flex items-start gap-1.5 text-[11px] text-emerald-600">
                        <Check className="h-3 w-3 mt-0.5 shrink-0" /> Idêntico à versão viva atual.
                      </p>
                    )}

                    <Button onClick={downloadExact} disabled={downloading || exporting} className="w-full rounded-xl gap-2">
                      {downloading || exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      Baixar PDF exato (o que a empresa recebeu)
                    </Button>
                  </div>

                  {!changing ? (
                    <Button variant="ghost" size="sm" onClick={startChange} className="w-full gap-1.5 text-muted-foreground hover:text-foreground">
                      <RefreshCw className="h-3.5 w-3.5" /> Trocar versão enviada
                    </Button>
                  ) : (
                    <ChangePanel
                      resumes={resumes}
                      selected={selected}
                      setSelected={setSelected}
                      busy={busy}
                      onCancel={() => setChanging(false)}
                      onConfirm={confirmChange}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                    <FileWarning className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-semibold">Nenhum currículo registrado para esta vaga</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Vincule a versão que você enviou para congelar uma cópia exata e rastreável.
                    </p>
                  </div>
                  {!changing ? (
                    <Button onClick={startChange} className="w-full rounded-xl gap-2">
                      <FileText className="h-4 w-4" /> Vincular currículo enviado
                    </Button>
                  ) : (
                    <ChangePanel
                      resumes={resumes}
                      selected={selected}
                      setSelected={setSelected}
                      busy={busy}
                      onCancel={() => setChanging(false)}
                      onConfirm={confirmChange}
                    />
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card p-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function ChangePanel({
  resumes, selected, setSelected, busy, onCancel, onConfirm,
}: {
  resumes: ResumeRecord[];
  selected: string;
  setSelected: (id: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/40 bg-muted/10 p-3">
      <ResumePicker resumes={resumes} value={selected} onChange={setSelected} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button size="sm" className="rounded-lg gap-1.5" onClick={onConfirm} disabled={busy || !selected}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Congelar snapshot
        </Button>
      </div>
    </div>
  );
}
