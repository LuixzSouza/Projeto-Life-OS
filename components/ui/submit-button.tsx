"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

// Botão de submit genérico que reflete o estado `pending` do <form> pai
// (via useFormStatus). Fonte única — use em qualquer formulário com Server Action.
export function SubmitButton({ children, className, variant = "default", size = "default", disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className={className} variant={variant} size={size}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}
