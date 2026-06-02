import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * BackLink — link discreto de "voltar" usado nos cabeçalhos de páginas de
 * detalhe (Saúde, Mercado, Flashcards…). Pensado para o slot `children` do
 * PageHeader, mas funciona em qualquer lugar.
 */
export function BackLink({
  href,
  label = "Voltar",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("w-fit", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-1.5 rounded-lg px-3 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
}
