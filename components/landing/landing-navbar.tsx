"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ChevronRight,
  Command,
  LogIn,
  ArrowRight,
} from "lucide-react";

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

export default function LandingNavbar({ authState }: NavbarProps) {
  const { isLoggedIn, isConfigured } = authState;

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* -----------------------------
   * Navegação
   * ---------------------------- */
  const navLinks = useMemo(
    () => [
      { label: "Módulos", href: "#modules" },
      { label: "Inteligência", href: "#ai" },
      { label: "Privacidade", href: "#privacy" },
      { label: "Rotina", href: "#routiny" },
      { label: "Configuração", href: "#config" },
      { label: "Dúvidas", href: "#faq" },
    ],
    []
  );

  /* -----------------------------
   * CTA Principal
   * ---------------------------- */
  const cta = useMemo(() => {
    if (isLoggedIn) {
      return {
        href: "/dashboard",
        label: "Abrir Dashboard",
        Icon: ArrowRight,
      };
    }

    if (isConfigured) {
      return {
        href: "/login",
        label: "Entrar no Sistema",
        Icon: LogIn,
      };
    }

    return {
      href: "/setup",
      label: "Instalar Life OS",
      Icon: Command,
    };
  }, [isLoggedIn, isConfigured]);

  /* -----------------------------
   * Scroll Detection
   * ---------------------------- */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* -----------------------------
   * Lock scroll when mobile menu is open
   * ---------------------------- */
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
  }, [mobileMenuOpen]);

  return (
    <>
      {/* ================= HEADER ================= */}
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500 border-b",
          scrolled
            ? "h-16 bg-background/80 backdrop-blur-xl border-border/60"
            : "h-24 bg-transparent border-transparent"
        )}
      >
        <div className="mx-auto max-w-7xl h-full px-6 flex items-center justify-between">
          {/* -------- Logo -------- */}
          <Link
            href="/"
            className="relative z-50 flex items-center gap-3 group"
            aria-label="Life OS Home"
          >
            <Image src={"/logo.webp"} width={40} height={40} alt="Life Os Home"/>

            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground leading-none">
                Life OS
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
                  v1.0 Stable
                </span>
              </div>
            </div>
          </Link>

          {/* -------- Desktop Nav -------- */}
          <div className="hidden md:flex items-center gap-4">
            <nav
              className="flex items-center gap-1 rounded-full bg-muted/50 px-2 py-1 border border-border/60 backdrop-blur-sm"
              aria-label="Primary Navigation"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-muted-foreground transition-all hover:bg-background hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Alternar tema (claro/escuro/sistema) */}
            <div className="text-muted-foreground hover:text-foreground">
              <ModeToggle />
            </div>

            <Link href={cta.href}>
              <Button
                className="h-10 px-6 rounded-full bg-primary text-primary-foreground text-xs font-bold gap-2 transition-all hover:scale-105 hover:opacity-90 shadow-sm"
              >
                {cta.label}
                <cta.Icon className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* -------- Mobile: toggle de tema + menu -------- */}
          <div className="flex items-center gap-1 md:hidden">
            <div className="text-muted-foreground">
              <ModeToggle />
            </div>
            <button
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="relative z-50 p-2 text-muted-foreground transition-transform active:scale-95 hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
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
            className="fixed inset-0 z-40 flex flex-col justify-between bg-background px-6 pt-32 pb-10 md:hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

            {/* Links */}
            <nav className="relative z-10 flex flex-col gap-2">
              {navLinks.map((link, idx) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + idx * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="group flex items-center justify-between border-b border-border/60 py-4 text-2xl font-bold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="transition-transform duration-300 group-hover:translate-x-2">
                      {link.label}
                    </span>
                    <ChevronRight className="h-5 w-5 text-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2" />
                  </Link>
                </motion.div>
              ))}
            </nav>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Command className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Life OS Mobile</p>
                  <p className="text-xs text-muted-foreground">
                    Acesse de qualquer lugar.
                  </p>
                </div>
              </div>

              <Link
                href={cta.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground hover:opacity-90 shadow-xl">
                  {cta.label}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
