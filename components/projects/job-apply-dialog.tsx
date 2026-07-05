"use client";

// Modal do fluxo "Candidatei-me": ao mover uma vaga para APPLIED, exige escolher
// QUAL versão de currículo foi enviada. Ao confirmar, congela um snapshot imutável
// (server action attachResumeSnapshot) — o histórico da vaga fica preservado
// mesmo que a versão viva seja editada/excluída depois.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { ResumePicker } from "./resume-picker";
import type { ResumeRecord } from "@/app/(dashboard)/jobs/resume-actions";
import type { JobWithProject } from "./job-types";
import { attachResumeSnapshot } from "@/app/(dashboard)/projects/actions/job";
import { updateJobStatus } from "@/app/(dashboard)/projects/actions";

interface JobApplyDialogProps {
  job: JobWithProject | null;
  resumes: ResumeRecord[];
  onOpenChange: (open: boolean) => void;
}

export function JobApplyDialog({ job, resumes, onOpenChange }: JobApplyDialogProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Pré-seleciona a versão já vinculada (ou o Base) quando o modal ABRE para outra
  // vaga. Padrão endossado do React (ajuste de estado durante o render ao detectar
  // troca de prop) — evita setState em effect e o re-render extra que ele causa.
  const [seenJobId, setSeenJobId] = useState<string | null>(null);
  if (job && job.id !== seenJobId) {
    setSeenJobId(job.id);
    const base = resumes.find((r) => r.isBase) ?? resumes[0];
    const linked = job.resumeId && resumes.some((r) => r.id === job.resumeId) ? job.resumeId : null;
    setSelected(linked ?? base?.id ?? "");
  }

  const confirm = async () => {
    if (!job || !selected) return;
    setBusy(true);
    const res = await attachResumeSnapshot(job.id, selected, true);
    setBusy(false);
    if (res.success) {
      toast.success("Candidatura registrada — currículo congelado para esta vaga. 🔒");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Não foi possível registrar a candidatura.");
    }
  };

  // Escape de UX: candidatar sem registrar currículo (não trava quem não usou o app p/ o CV).
  const skip = async () => {
    if (!job) return;
    setBusy(true);
    const res = await updateJobStatus(job.id, "APPLIED");
    setBusy(false);
    if (res.success) {
      toast.success('Movido para "Inscrito".');
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error("Não foi possível mudar o estágio.");
    }
  };

  return (
    <Dialog open={!!job} onOpenChange={(open) => { if (!open) onOpenChange(false); }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Send className="h-4 w-4 text-primary" /> Qual currículo você enviou?
          </DialogTitle>
          {job && (
            <DialogDescription>
              Candidatura em <b>{job.company}</b> · {job.role}. Vamos congelar uma cópia exata do currículo escolhido.
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogBody className="space-y-3">
          <ResumePicker resumes={resumes} value={selected} onChange={setSelected} />
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 mt-0.5 shrink-0" />
            O snapshot preserva o PDF exato desta candidatura — editar ou excluir a versão depois não afeta este registro.
          </p>
        </DialogBody>
        <DialogFooter className="flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          <button
            type="button"
            onClick={skip}
            disabled={busy}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:opacity-50"
          >
            Candidatar sem registrar currículo
          </button>
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button className="rounded-xl gap-2" onClick={confirm} disabled={busy || !selected}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Confirmar envio
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
