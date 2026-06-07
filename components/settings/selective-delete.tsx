"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { deleteModuleData } from "@/app/(dashboard)/settings/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Mantém os ids em sincronia com o mapa `deleters` em actions/security.ts.
const MODULES = [
  { id: "tasks", label: "Tarefas & Projetos" },
  { id: "finance", label: "Finanças" },
  { id: "agenda", label: "Agenda & Rotinas" },
  { id: "studies", label: "Estudos & Flashcards" },
  { id: "health", label: "Saúde & Treinos" },
  { id: "crm", label: "Negócios & Clientes" },
  { id: "connections", label: "Conexões" },
  { id: "entertainment", label: "Entretenimento" },
  { id: "wardrobe", label: "Closet" },
  { id: "links", label: "Links Salvos" },
  { id: "ai", label: "Conversas com a IA" },
  { id: "vault", label: "Cofre de Acessos" },
  { id: "sites", label: "Sites Gerenciados" },
];

const CONFIRM_WORD = "APAGAR";

/**
 * Exclusão seletiva por módulo (Zona de Perigo). O usuário marca quais conjuntos
 * de dados quer zerar e confirma digitando uma palavra — só então a ação roda.
 * Irreversível: hard-delete escopado ao usuário no servidor.
 */
export function SelectiveDelete() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectedLabels = MODULES.filter((m) => selected.includes(m.id)).map((m) => m.label);

  const handleConfirm = () => {
    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) {
      toast.error(`Digite "${CONFIRM_WORD}" para confirmar.`);
      return;
    }
    startTransition(async () => {
      const res = await deleteModuleData(selected);
      if (res.success) {
        toast.success(res.message, { duration: 6000 });
        setSelected([]);
        setConfirmOpen(false);
        setConfirmText("");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <>
      <Card className="border border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-destructive flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Apagar dados por módulo
          </CardTitle>
          <CardDescription className="text-xs">
            Escolha conjuntos de dados para apagar definitivamente. O resto do sistema
            permanece intacto. Esta ação <strong>não pode ser desfeita</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULES.map((mod) => (
              <div
                key={mod.id}
                className="flex items-center space-x-2 border border-border/60 p-2 rounded-md hover:bg-destructive/5 transition-colors"
              >
                <Checkbox
                  id={`del-${mod.id}`}
                  checked={selected.includes(mod.id)}
                  onCheckedChange={() => toggle(mod.id)}
                />
                <Label htmlFor={`del-${mod.id}`} className="text-xs cursor-pointer flex-1">
                  {mod.label}
                </Label>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="destructive"
            className="w-full gap-2"
            disabled={selected.length === 0 || isPending}
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Apagar {selected.length > 0 ? `${selected.length} módulo(s)` : "selecionados"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !open && setConfirmOpen(false)}>
        <AlertDialogContent className="z-[9999] fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p className="text-sm text-muted-foreground">
                  Os dados destes módulos serão apagados <strong>permanentemente</strong>:
                </p>
                <ul className="text-sm bg-muted p-3 rounded-md border list-disc list-inside space-y-0.5">
                  {selectedLabels.map((l) => (
                    <li key={l} className="font-medium text-foreground">{l}</li>
                  ))}
                </ul>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Digite <code className="text-destructive font-bold">{CONFIRM_WORD}</code> para confirmar:
                  </Label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_WORD}
                    className="font-mono"
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setConfirmText("");
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // não fecha automaticamente; validamos o texto
                handleConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Apagar definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
