"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectFormDialog } from "./subject-form-dialog";

type DialogProps = ComponentProps<typeof SubjectFormDialog>;

interface CreateSubjectButtonProps {
  /** Matérias-raiz que podem ser "pai" da nova (vazio no onboarding). */
  potentialParents?: DialogProps["potentialParents"];
  label?: ReactNode;
  className?: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  /** Mostra o ícone "+" antes do label. */
  withIcon?: boolean;
}

/**
 * Botão autocontido que abre o formulário de criação de matéria (o MESMO
 * SubjectFormDialog do grid). Existe porque o onboarding de /studies apontava
 * para a rota /studies/new — que nunca existiu (a criação sempre foi via modal),
 * resultando em 404 ao clicar em "Criar matéria".
 */
export function CreateSubjectButton({
  potentialParents = [],
  label = "Criar matéria",
  className,
  variant,
  size,
  withIcon = false,
}: CreateSubjectButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className} variant={variant} size={size}>
        {withIcon && <Plus className="mr-2 h-4 w-4" />}
        {label}
      </Button>

      <SubjectFormDialog
        open={open}
        onClose={() => setOpen(false)}
        potentialParents={potentialParents}
      />
    </>
  );
}
