"use client";

import { useSyncExternalStore, type ElementType } from "react";
import { Tag as TagIcon, Paperclip, GitBranch, Sparkles, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lifeos.connect.explainerDismissed";

// Store externo simples para o "dispensado" (persistido no localStorage). Lido
// via useSyncExternalStore — sem setState em efeito (regra do projeto) e sem
// mismatch de hidratação (o snapshot do servidor é sempre "não dispensado").
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function readDismissed(): boolean {
  try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
}
function setDismissedStore(value: boolean) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage indisponível (modo privado) */ }
  listeners.forEach((l) => l());
}

/**
 * Painel "Pra que serve isto?" — o elo que faltava para o usuário ENTENDER o
 * tecido conectivo (Tags / Anexos / Conexões). Três exemplos concretos e
 * cross-módulo, dispensável (lembra no localStorage). Fica no topo do hub
 * /connect. Não é mais uma função; é o "aha" da função que já existe.
 */
interface Example {
  icon: ElementType;
  title: string;
  example: string;
  /** classes do chip do ícone (identidade de cada ferramenta) */
  chip: string;
}

const EXAMPLES: Example[] = [
  {
    icon: TagIcon,
    title: "Tags — etiquetas que cruzam módulos",
    example: "Marque uma tarefa, uma nota e um gasto com #Viagem — e veja os três juntos, não importa de que área sejam.",
    chip: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  {
    icon: Paperclip,
    title: "Anexos — arquivos e links no próprio item",
    example: "Solte o PDF do contrato dentro do cliente, o print junto do gasto, ou cole um link de referência numa nota.",
    chip: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: GitBranch,
    title: "Conexões — ligue itens que têm a ver",
    example: "Conecte a tarefa à nota da reunião onde ela nasceu, ou o gasto ao projeto que o gerou. Um clique leva ao outro.",
    chip: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
];

export function ConnectExplainer() {
  // Servidor sempre "não dispensado" (3º arg); o cliente lê o real após hidratar.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => false);

  const dismiss = () => setDismissedStore(true);
  const reopen = () => setDismissedStore(false);

  // Depois de dispensado, resta só um link discreto para reabrir a qualquer hora.
  if (dismissed) {
    return (
      <button
        type="button"
        onClick={reopen}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <HelpCircle className="h-3.5 w-3.5" /> Pra que serve isto?
      </button>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Ocultar explicação"
        className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-4 flex items-start gap-2.5 pr-8">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Pra que serve isto?</h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            No Life OS tudo pode se ligar a tudo. Estas três ferramentas aparecem em{" "}
            <strong className="font-medium text-foreground">qualquer item</strong> (tarefa, nota, gasto, cliente…),
            no cartão <em className="not-italic font-medium text-foreground">«Tags, Anexos &amp; Conexões»</em>.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {EXAMPLES.map(({ icon: Icon, title, example, chip }) => (
          <div key={title} className="rounded-xl border border-border/40 bg-background/40 p-3.5">
            <span className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", chip)}>
              <Icon className="h-4 w-4" />
            </span>
            <p className="text-[13px] font-semibold leading-tight text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{example}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground/80">
        💡 Dica: abra qualquer item e procure o cartão{" "}
        <span className="font-medium text-muted-foreground">«Tags, Anexos &amp; Conexões»</span> no rodapé para começar.
      </p>
    </section>
  );
}
