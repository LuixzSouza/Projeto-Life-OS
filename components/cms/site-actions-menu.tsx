"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogFooter
} from "@/components/ui/dialog";
import { MoreVertical, Edit2, Trash2, Globe, Save, Loader2, AlertCircle } from "lucide-react";
import { updateSite, deleteSite } from "@/app/(dashboard)/cms/actions";
import { toast } from "sonner";

export function SiteActionsMenu({ site }: { site: { id: string; name: string; url: string | null } }) {
  const router = useRouter();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = async (formData: FormData) => {
    setIsLoading(true);
    formData.append("id", site.id);
    try {
      await updateSite(formData);
      toast.success("Container atualizado com sucesso!");
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao atualizar o container.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteSite(site.id);
      toast.success("Container excluído permanentemente.");
      setIsDeleteDialogOpen(false);
      router.push("/cms"); 
    } catch (error) {
      toast.error("Erro ao excluir o container.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Mais ações" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/40 shadow-xl z-[100]">
          <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)} className="gap-2 text-xs font-bold cursor-pointer">
            <Edit2 className="h-3.5 w-3.5" /> Editar Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="gap-2 text-xs font-bold text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 cursor-pointer">
            <Trash2 className="h-3.5 w-3.5" /> Excluir Container
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* MODAL DE EDIÇÃO */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent size="md">
          <DialogHeader
            icon={<Edit2 />}
            title="Editar container"
            description="Ajuste as configurações base deste container."
          />

          <form action={handleEdit}>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Nome do container</label>
                <Input name="name" defaultValue={site.name} required className="h-12 rounded-xl bg-muted/30 border-border/50 shadow-inner font-bold focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><Globe className="h-3 w-3"/> Domínio alvo</label>
                <Input name="url" defaultValue={site.url || ""} className="h-12 rounded-xl bg-muted/30 border-border/50 shadow-inner font-mono text-xs focus-visible:ring-primary/20" />
              </div>
            </DialogBody>

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold shadow-sm hover:scale-[1.02] transition-transform">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DELEÇÃO */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent size="md">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner mb-1">
              <AlertCircle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Excluir container?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Você está prestes a excluir o container <span className="font-semibold text-rose-500">{site.name}</span>. Esta ação apaga permanentemente todos os endpoints JSON atrelados a ele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-stretch">
            <Button type="button" variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12 rounded-xl font-semibold">
              Cancelar
            </Button>
            <Button type="button" onClick={handleDelete} disabled={isLoading} className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold shadow-sm">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}