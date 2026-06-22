"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Server, Globe, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTrigger, DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { createSite } from "@/app/(dashboard)/cms/actions";

// Diálogo controlado: fecha sozinho ao concluir e bloqueia o botão enquanto
// grava — evita o duplo-clique que criava dois containers (modal não fechava).
export function NewSiteDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      try {
        await createSite(formData);
        toast.success("Container criado!");
        setOpen(false);
      } catch {
        toast.error("Não foi possível criar o container. Tente de novo.");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-10 px-4 gap-2 font-medium rounded-lg shadow-sm">
          <Plus className="h-4 w-4" /> Novo Container
        </Button>
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader
          icon={<Server />}
          title="Novo container"
          description="Crie um container para armazenar suas rotas JSON."
        />

        <form action={handleSubmit}>
          <DialogBody className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Nome do projeto</Label>
              <Input
                name="name"
                placeholder="Ex: Website Institucional"
                required
                className="h-10 rounded-lg bg-muted/20 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                Domínio alvo <span className="text-[10px] font-normal opacity-60">(opcional)</span>
              </Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="url"
                  placeholder="https://meusite.com.br"
                  className="h-10 pl-9 rounded-lg bg-muted/20 border-border/50 font-mono text-sm"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full h-10 rounded-lg font-semibold shadow-sm gap-2">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending ? "Criando…" : "Criar container"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
