// app/(marketing)/layout.tsx
// Shell público das páginas institucionais do rodapé (privacy/terms/contact/changelog).
// Header enxuto (logo + voltar + tema) e reaproveita o LandingFooter.
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { ModeToggle } from "@/components/settings/mode-toggle";
import LandingFooter from "@/components/landing/landing-footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="landing-surface relative flex min-h-screen flex-col">
      {/* grade sutil de fundo (themeable) */}
      <div className="landing-grid pointer-events-none fixed inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_70%)]" />

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-3" aria-label="Life OS — início">
            <Image src="/logo.webp" width={32} height={32} alt="Life OS" className="transition-transform group-hover:scale-105" />
            <span className="font-bold tracking-tight text-foreground">Life OS</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Início
            </Link>
            <div className="text-muted-foreground">
              <ModeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-6 py-16">{children}</main>

      <LandingFooter />
    </div>
  );
}
