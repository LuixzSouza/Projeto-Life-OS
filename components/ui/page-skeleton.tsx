// components/ui/page-skeleton.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SkeletonVariant = "dashboard" | "grid" | "list" | "feed" | "detail";

interface PageSkeletonProps {
  variant?: SkeletonVariant;
  /** Quantidade de itens repetidos (cards/linhas). */
  count?: number;
  /** Mostra o cabeçalho padrão (título + subtítulo + ação). */
  header?: boolean;
  className?: string;
}

/**
 * Skeleton de página reutilizável com variantes por tipo de tela.
 * Cada módulo importa este componente no seu loading.tsx escolhendo a
 * variante que mais se parece com o conteúdo real — assim cada loading
 * fica visivelmente diferente, mas mantém consistência visual.
 */
export function PageSkeleton({
  variant = "grid",
  count,
  header = true,
  className,
}: PageSkeletonProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-7xl space-y-8 p-6 sm:p-8 animate-in fade-in duration-500",
        className
      )}
    >
      {header && <HeaderSkeleton />}
      {variant === "dashboard" && <DashboardBody count={count ?? 4} />}
      {variant === "grid" && <GridBody count={count ?? 8} />}
      {variant === "list" && <ListBody count={count ?? 6} />}
      {variant === "feed" && <FeedBody count={count ?? 5} />}
      {variant === "detail" && <DetailBody />}
    </div>
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32 rounded-md" />
    </div>
  );
}

/* Métricas + gráfico + lista lateral (finance, health, dashboard, business). */
function DashboardBody({ count }: { count: number }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="space-y-3 rounded-xl border border-border/40 bg-card p-5 shadow-sm"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-border/40 bg-card p-6 shadow-sm lg:col-span-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-4 rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* Grade de cards (access, projects, wardrobe, studies, flashcards, links). */
function GridBody({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="space-y-4 rounded-2xl border border-border/40 bg-card p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="flex justify-between pt-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Linhas verticais (social, transações, listas densas). */
function ListBody({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-border/40 bg-card p-4 shadow-sm"
        >
          <Skeleton className="size-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/* Feed/chat com bolhas alternadas (ai). */
function FeedBody({ count }: { count: number }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}
        >
          {i % 2 === 0 && <Skeleton className="size-9 shrink-0 rounded-full" />}
          <div className={cn("space-y-2", i % 2 === 0 ? "w-2/3" : "w-1/2")}>
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-4/5 rounded-lg" />
            {i % 2 === 0 && <Skeleton className="h-4 w-3/5 rounded-lg" />}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Página de detalhe de um único item (projects/[slug], flashcards/[id]). */
function DetailBody() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="space-y-4 rounded-xl border border-border/40 bg-card p-6 shadow-sm">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-9 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
