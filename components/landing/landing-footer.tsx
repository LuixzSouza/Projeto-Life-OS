"use client";

import { Github, Mail, ArrowRight, Heart, BookText } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { siteConfig, copyrightRange } from "@/config/site.config";

const REPO = siteConfig.urls.repo;
const PROFILE = siteConfig.urls.profile;

type LinkKind = "anchor" | "page" | "external";
interface FooterLink {
  label: string;
  href: string;
  kind: LinkKind;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Produto",
    links: [
      { label: "Módulos", href: "/#modules", kind: "anchor" },
      { label: "Inteligência IA", href: "/#ai", kind: "anchor" },
      { label: "Privacidade", href: "/#privacy", kind: "anchor" },
      { label: "Rotina", href: "/#routine", kind: "anchor" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Instalar localmente", href: "/#config", kind: "anchor" },
      { label: "Dúvidas frequentes", href: "/#faq", kind: "anchor" },
      { label: "Changelog", href: "/changelog", kind: "page" },
      { label: "Documentação", href: REPO, kind: "external" },
    ],
  },
  {
    title: "Projeto",
    links: [
      { label: "Política de Privacidade", href: "/privacy", kind: "page" },
      { label: "Termos de Uso", href: "/terms", kind: "page" },
      { label: "Contato", href: "/contact", kind: "page" },
      { label: "Open Source (MIT)", href: REPO, kind: "external" },
    ],
  },
];

export default function LandingFooter() {
  const pathname = usePathname();

  // Âncoras: na landing rolam suave com offset do header; fora dela, o Link
  // navega para "/#secao" e o browser cuida do scroll após carregar.
  const handleAnchor = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const hash = href.split("#")[1];
    if (pathname === "/" && hash) {
      const el = document.getElementById(hash);
      if (el) {
        e.preventDefault();
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
      }
    }
  };

  const linkClass = "transition-colors hover:text-primary";

  return (
    <footer className="relative border-t border-border/60 bg-card pb-8 pt-16">
      {/* fio de accent no topo */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-12">
          {/* Marca + newsletter */}
          <div className="space-y-6 md:col-span-5">
            <Link href="/" className="flex items-center gap-3">
              <Image src={siteConfig.brand.logo} width={36} height={36} alt={siteConfig.brand.name} />
              <span className="text-xl font-bold tracking-tight text-foreground">{siteConfig.brand.name}</span>
            </Link>

            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              {siteConfig.brand.description}
            </p>

            {siteConfig.features.showNewsletter && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Acompanhe o projeto
              </span>
              <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full max-w-[240px] rounded-lg border border-border/60 bg-background px-4 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="submit"
                  aria-label="Inscrever"
                  className="grid place-items-center rounded-lg bg-primary px-3 text-primary-foreground transition-all hover:opacity-90 hover:shadow-[0_0_20px_-6px_var(--color-primary)]"
                >
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </div>
            )}
          </div>

          {/* Colunas de links */}
          <div className="grid grid-cols-2 gap-8 md:col-span-7 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div key={col.title} className="space-y-4">
                <h4 className="text-sm font-bold text-foreground">{col.title}</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      {link.kind === "external" ? (
                        <a href={link.href} target="_blank" rel="noreferrer" className={linkClass}>
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          href={link.href}
                          onClick={link.kind === "anchor" ? (e) => handleAnchor(e, link.href) : undefined}
                          className={linkClass}
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Barra inferior */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 md:flex-row">
          <p className="text-xs text-muted-foreground">© {copyrightRange()} {siteConfig.footer.copyrightHolder} · {siteConfig.footer.note}</p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            Feito com <Heart className="size-3 fill-primary text-primary" /> por{" "}
            <span className="font-bold text-foreground">{siteConfig.footer.author}</span>
          </div>

          <div className="flex items-center gap-4">
            <a href={REPO} target="_blank" rel="noreferrer" aria-label="Repositório no GitHub" className="text-muted-foreground transition-colors hover:text-primary">
              <Github className="size-4" />
            </a>
            <Link href="/contact" aria-label="Contato" className="text-muted-foreground transition-colors hover:text-primary">
              <Mail className="size-4" />
            </Link>
            <a href={PROFILE} target="_blank" rel="noreferrer" aria-label="Perfil do desenvolvedor" className="text-muted-foreground transition-colors hover:text-primary">
              <BookText className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
