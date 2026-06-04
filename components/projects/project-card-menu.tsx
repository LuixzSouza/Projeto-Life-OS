"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal, ExternalLink, Copy, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DeleteProjectDialog } from "./delete-project-dialog";

interface ProjectCardMenuProps {
  projectId: string;
  slug: string;
  title: string;
  taskCount: number;
}

// Menu de ações rápidas no card da lista. Vive dentro do card clicável, então
// tudo precisa de stopPropagation para não abrir o modal de detalhes por baixo.
export function ProjectCardMenu({ projectId, slug, title, taskCount }: ProjectCardMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  // O card é um <Link>: além de não borbulhar, precisa cancelar a navegação ao clicar no menu.
  const stopNav = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={stopNav}
            onPointerDown={stop}
            aria-label="Ações do projeto"
            className="h-8 w-8 rounded-lg text-muted-foreground opacity-0 transition-all group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 hover:bg-muted hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={stop} className="w-52 rounded-xl p-1.5 shadow-xl border-border/40">
          <DropdownMenuItem
            onSelect={() => router.push(`/projects/${slug}`)}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover/i:text-primary transition-colors" />
            <span className="font-semibold text-sm">Abrir board</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              navigator.clipboard.writeText(`${window.location.origin}/projects/${slug}`);
              toast.success("Link do projeto copiado!");
            }}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer group/i"
          >
            <Copy className="h-4 w-4 text-muted-foreground group-hover/i:text-blue-500 transition-colors" />
            <span className="font-semibold text-sm">Copiar link</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5 bg-border/40" />
          <DropdownMenuItem
            onSelect={() => setDeleteOpen(true)}
            className="rounded-lg px-2.5 py-2 gap-2.5 cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
          >
            <Trash2 className="h-4 w-4" />
            <span className="font-semibold text-sm">Mover para a lixeira</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        projectId={projectId}
        title={title}
        taskCount={taskCount}
      />
    </>
  );
}
