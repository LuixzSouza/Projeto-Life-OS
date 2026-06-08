"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Footprints, Plus, Pencil, Trash2, AlertTriangle, Target, Loader2, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { createShoe, updateShoe, deleteShoe, type ShoeWithMileage } from "@/app/(dashboard)/health/actions";

// Status de desgaste a partir da % da meta de troca.
type WearTone = "ok" | "warn" | "danger";
function wearStatus(totalKm: number, maxDistance: number | null): { pct: number | null; tone: WearTone } {
  if (!maxDistance || maxDistance <= 0) return { pct: null, tone: "ok" };
  const pct = totalKm / maxDistance;
  const tone: WearTone = pct >= 1 ? "danger" : pct >= 0.8 ? "warn" : "ok";
  return { pct, tone };
}

const TONE = {
  ok: { bar: "bg-primary", text: "text-muted-foreground", chip: "" },
  warn: { bar: "bg-amber-500", text: "text-amber-600", chip: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  danger: { bar: "bg-rose-500", text: "text-rose-600", chip: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
};

export function ShoeMileageCard({ shoes }: { shoes: ShoeWithMileage[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ShoeWithMileage | null>(null); // form aberto (novo se name vazio)
  const [deleting, setDeleting] = useState<ShoeWithMileage | null>(null);
  const [name, setName] = useState("");
  const [maxDistance, setMaxDistance] = useState("");
  const [saving, setSaving] = useState(false);

  const openForm = (shoe: ShoeWithMileage | null) => {
    setEditing(shoe ?? { id: null, name: "", maxDistance: null, retired: false, totalKm: 0, runCount: 0 });
    setName(shoe?.name ?? "");
    setMaxDistance(shoe?.maxDistance != null ? String(shoe.maxDistance) : "");
  };

  const closeForm = () => setEditing(null);

  const submit = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao tênis."); return; }
    setSaving(true);
    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("maxDistance", maxDistance);
    // Com id (cadastro existente) → update; senão cria/upserta por nome.
    let res;
    if (editing?.id) {
      fd.append("id", editing.id);
      res = await updateShoe(fd);
    } else {
      res = await createShoe(fd);
    }
    setSaving(false);
    if (res.success) { toast.success(res.message); closeForm(); router.refresh(); }
    else toast.error(res.message);
  };

  const toggleRetire = async (shoe: ShoeWithMileage) => {
    if (!shoe.id) return;
    const fd = new FormData();
    fd.append("id", shoe.id);
    fd.append("name", shoe.name);
    if (shoe.maxDistance != null) fd.append("maxDistance", String(shoe.maxDistance));
    fd.append("retired", String(!shoe.retired));
    const res = await updateShoe(fd);
    if (res.success) { toast.success(shoe.retired ? "Tênis reativado." : "Tênis aposentado."); router.refresh(); }
    else toast.error(res.message);
  };

  const confirmDelete = async () => {
    if (!deleting?.id) { setDeleting(null); return; }
    const res = await deleteShoe(deleting.id);
    if (res.success) { toast.success(res.message); router.refresh(); }
    else toast.error(res.message);
    setDeleting(null);
  };

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-center justify-between py-1">
          <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
            <Footprints className="h-4 w-4 text-primary" /> Meus Tênis
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => openForm(null)}>
            <Plus className="h-3.5 w-3.5" /> Cadastrar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        {shoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
            <Footprints className="h-7 w-7 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Cadastre seus tênis e defina a meta de km — eu aviso quando estiver na hora de trocar.
            </p>
          </div>
        ) : (
          shoes.map((shoe) => {
            const { pct, tone } = wearStatus(shoe.totalKm, shoe.maxDistance);
            const t = TONE[tone];
            return (
              <div key={shoe.id ?? shoe.name} className={cn("rounded-xl border border-border/50 p-3", shoe.retired && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate flex items-center gap-1.5">
                      {shoe.name}
                      {shoe.retired && <span className="text-[9px] font-semibold uppercase rounded bg-muted px-1 py-0.5 text-muted-foreground">aposentado</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{shoe.runCount} corrida{shoe.runCount !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {tone !== "ok" && (
                      <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold", t.chip)}>
                        <AlertTriangle className="h-3 w-3" /> {tone === "danger" ? "Troque!" : "Atenção"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quilometragem + meta */}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-black tabular-nums">{shoe.totalKm} <span className="text-xs font-semibold text-muted-foreground">km</span></span>
                  {shoe.maxDistance ? (
                    <span className={cn("text-[11px] font-semibold", t.text)}>
                      {pct != null ? `${Math.round(pct * 100)}%` : ""} de {shoe.maxDistance} km
                    </span>
                  ) : null}
                </div>

                {shoe.maxDistance ? (
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full transition-all", t.bar)} style={{ width: `${Math.min(100, ((pct ?? 0) * 100))}%` }} />
                  </div>
                ) : null}

                {/* Ações */}
                <div className="mt-2.5 flex items-center gap-1">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-primary" onClick={() => openForm(shoe)}>
                    {shoe.maxDistance != null || shoe.id ? <Pencil className="h-3 w-3" /> : <Target className="h-3 w-3" />}
                    {shoe.id ? "Editar" : "Definir meta"}
                  </Button>
                  {shoe.id && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px] text-muted-foreground hover:text-foreground" onClick={() => toggleRetire(shoe)}>
                        <Archive className="h-3 w-3" /> {shoe.retired ? "Reativar" : "Aposentar"}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-destructive" onClick={() => setDeleting(shoe)} title="Excluir cadastro">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      {/* Form de cadastro/edição */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Footprints className="h-5 w-5 text-primary" /> {editing?.id ? "Editar tênis" : "Cadastrar tênis"}</DialogTitle>
            <DialogDescription>Defina a meta de km para receber o alerta de troca (80% âmbar · 100% vermelho).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do tênis</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nike Pegasus 40" className="h-10" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Meta de troca (km) <span className="font-normal text-muted-foreground">— opcional</span></Label>
              <Input inputMode="decimal" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} placeholder="Ex: 600" className="h-10 font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={saving} className="rounded-xl">Cancelar</Button>
            <Button onClick={submit} disabled={saving} className="rounded-xl gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exclusão do cadastro (não apaga as corridas, só o registro/meta) */}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &quot;{deleting?.name}&quot; do cadastro?</AlertDialogTitle>
            <AlertDialogDescription>As corridas e a quilometragem não são apagadas — só o cadastro e a meta de troca deste tênis.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
