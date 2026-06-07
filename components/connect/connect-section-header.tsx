import type { ElementType } from "react";

/**
 * Cabeçalho curto de seção para os editores de conexão (Tags / Anexos / Conexões).
 * Mostra ícone + título + uma frase do que a seção serve, deixando cada bloco
 * auto-explicativo em qualquer módulo onde for usado.
 */
export function ConnectSectionHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: ElementType;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}
