// app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* Ambient background sutil baseado no tema */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[40%] w-[60%] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute inset-0 bg-gradient-subtle" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Glyph 404 */}
        <div className="relative">
          <span className="select-none text-[8rem] font-black leading-none tracking-tighter text-gradient-primary sm:text-[11rem]">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-border/50 bg-card/80 shadow-sm backdrop-blur-md sm:size-20">
              <Compass className="size-8 text-muted-foreground sm:size-10" />
            </div>
          </div>
        </div>

        <div className="flex max-w-md flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Página não encontrada
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            A rota que você tentou acessar não existe ou foi movida. Verifique o
            endereço ou volte para um lugar seguro.
          </p>
        </div>

        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">
              <Home className="size-4" />
              Ir para o Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/">
              <ArrowLeft className="size-4" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
