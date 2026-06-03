"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Command, LogIn, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/settings/mode-toggle";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface NavbarProps {
  authState: {
    isLoggedIn: boolean;
    isConfigured: boolean;
  };
}

// Altura do header fixo (px) — usada como offset no scroll suave.
const HEADER_OFFSET = 80;

export default function LandingNavbar({ authState }: NavbarProps) {
  const { isLoggedIn, isConfigured } = authState;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  /* Navegação (hrefs casam com os id reais das seções em app/page.tsx). */
  const navLinks = useMemo(
    () => [
      { label: "Módulos", href: "#modules" },
      { label: "Inteligência", href: "#ai" },
      { label: "Privacidade", href: "#privacy" },
      { label: "Rotina", href: "#routine" },
      { label: "Configuração", href: "#config" },
      { label: "Dúvidas", href: "#faq" },
    ],
    []
  );

  /* CTA principal conforme estado de auth/instalação. */
  const cta = useMemo(() => {
    if (isLoggedIn) return { href: "/dashboard", label: "Abrir Dashboard", Icon: ArrowRight };
    if (isConfigured) return { href: "/login", label: "Entrar no Sistema", Icon: LogIn };
    return { href: "/setup", label: "Instalar Life OS", Icon: Command };
  }, [isLoggedIn, isConfigured]);

  /* Header encolhe ao rolar. */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Trava o scroll com o menu mobile aberto. */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
  }, [mobileMenuOpen]);

  /* Scroll-spy: marca a seção ativa conforme ela cruza o meio da viewport. */
  useEffect(() => {
    const sections = navLinks
      .map((l) => document.getElementById(l.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [navLinks]);

  /* Scroll suave com offset do header fixo (evita seção sob a navbar). */
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const el = document.querySelector(href);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ================= HEADER ================= */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-all duration-500",
          scrolled
            ? "h-16 border-border/60 bg-background/80 backdrop-blur-xl"
            : "h-24 border-transparent bg-transparent"
        )}
      >
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          {/* -------- Logo -------- */}
          <Link href="/" className="group relative z-50 flex items-center gap-3" aria-label="Life OS Home">
            <Image src="/logo.webp" width={40} height={40} alt="Life OS" className="transition-transform duration-300 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="text-base font-bold leading-none tracking-tight text-foreground">Life OS</span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" />
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">v1.0 Stable</span>
              </div>
            </div>
          </Link>

          {/* -------- Desktop Nav -------- */}
          <div className="hidden items-center gap-4 md:flex">
            <nav
              className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-1 backdrop-blur-sm"
              aria-label="Navegação principal"
            >
              {navLinks.map((link) => {
                const isActive = activeSection === link.href.slice(1);
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-primary/15 ring-1 ring-inset ring-primary/20"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{link.label}</span>
                  </a>
                );
              })}
            </nav>

            <div className="text-muted-foreground hover:text-foreground">
              <ModeToggle />
            </div>

            <Link href={cta.href}>
              <Button className="h-10 gap-2 rounded-full bg-primary px-6 text-xs font-bold text-primary-foreground shadow-sm transition-all hover:scale-105 hover:opacity-90 hover:shadow-[0_0_24px_-6px_var(--color-primary)]">
                {cta.label}
                <cta.Icon className="size-3.5" />
              </Button>
            </Link>
          </div>

          {/* -------- Mobile: tema + menu -------- */}
          <div className="flex items-center gap-1 md:hidden">
            <div className="text-muted-foreground">
              <ModeToggle />
            </div>
            <button
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="relative z-50 p-2 text-muted-foreground transition-transform hover:text-foreground active:scale-95"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* ================= MOBILE MENU ================= */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-40 flex flex-col justify-between bg-background px-6 pb-10 pt-32 md:hidden"
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />

            {/* Links */}
            <nav className="relative z-10 flex flex-col gap-2">
              {navLinks.map((link, idx) => {
                const isActive = activeSection === link.href.slice(1);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + idx * 0.05 }}
                  >
                    <a
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className={cn(
                        "group flex items-center justify-between border-b border-border/60 py-4 text-2xl font-bold transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className="flex items-center gap-3 transition-transform duration-300 group-hover:translate-x-2">
                        {isActive && <span className="size-2 rounded-full bg-primary" />}
                        {link.label}
                      </span>
                      <ChevronRight className="size-5 -translate-x-2 text-primary opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </a>
                  </motion.div>
                );
              })}
            </nav>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-4">
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Command className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Life OS Mobile</p>
                  <p className="text-xs text-muted-foreground">Acesse de qualquer lugar.</p>
                </div>
              </div>

              <Link href={cta.href} onClick={() => setMobileMenuOpen(false)} className="block w-full">
                <Button className="h-14 w-full gap-2 rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-xl hover:opacity-90">
                  {cta.label}
                  <cta.Icon className="size-5" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
