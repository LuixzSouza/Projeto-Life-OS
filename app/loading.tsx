// app/loading.tsx
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="relative flex size-14 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">Carregando…</p>
    </div>
  );
}
