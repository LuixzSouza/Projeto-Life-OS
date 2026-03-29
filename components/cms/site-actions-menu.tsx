"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
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
        {/* 🟢 CORREÇÃO: Adicionado z-[100] aqui */}
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8 border-border/40 shadow-2xl bg-card z-[100]">
          <DialogHeader className="mb-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
              <Edit2 className="h-6 w-6" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Editar Instância</DialogTitle>
            <DialogDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground/60">
              Ajuste as configurações base deste container.
            </DialogDescription>
          </DialogHeader>

          <form action={handleEdit} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome do Container</label>
                <Input name="name" defaultValue={site.name} required className="h-12 rounded-xl bg-muted/30 border-border/50 shadow-inner font-bold focus-visible:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2"><Globe className="h-3 w-3"/> Domínio Alvo</label>
                <Input name="url" defaultValue={site.url || ""} className="h-12 rounded-xl bg-muted/30 border-border/50 shadow-inner font-mono text-xs focus-visible:ring-primary/20" />
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 mt-2 hover:scale-[1.02] transition-transform">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE DELEÇÃO */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        {/* 🟢 CORREÇÃO: Adicionado z-[100] aqui */}
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8 border-rose-500/20 shadow-2xl bg-card z-[100]">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-16 w-16 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20 shadow-inner">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">Atenção!</h2>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mt-2 leading-relaxed">
                Você está prestes a excluir o container <span className="text-rose-500">{site.name}</span>. Esta ação apagará permanentemente todos os endpoints JSON atrelados a ele.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDeleteDialogOpen(false)} className="flex-1 h-12 rounded-xl font-black uppercase tracking-widest text-[11px]">
                Cancelar
              </Button>
              <Button type="button" onClick={handleDelete} disabled={isLoading} className="flex-1 h-12 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-rose-500/20">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Exclusão"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}