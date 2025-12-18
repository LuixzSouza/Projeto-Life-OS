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
import { cn } from "@/lib/utils";

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
            ? "h-16 bg-[#050505]/80 backdrop-blur-xl border-white/5"
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
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-black border border-white/10 flex items-center justify-center shadow-2xl transition-all group-hover:border-white/20">
              <Command className="h-5 w-5 text-white" />
            </div>

            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white leading-none">
                Life OS
              </span>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wide text-zinc-500">
                  v1.0 Stable
                </span>
              </div>
            </div>
          </Link>

          {/* -------- Desktop Nav -------- */}
          <div className="hidden md:flex items-center gap-8">
            <nav
              className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 border border-white/5 backdrop-blur-sm"
              aria-label="Primary Navigation"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-1.5 rounded-full text-xs font-medium text-zinc-400 transition-all hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <Link href={cta.href}>
              <Button
                className="h-10 px-6 rounded-full bg-white text-black text-xs font-bold gap-2 transition-all hover:scale-105 hover:bg-zinc-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                {cta.label}
                <cta.Icon className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* -------- Mobile Toggle -------- */}
          <button
            aria-label="Toggle menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="relative z-50 p-2 text-zinc-400 transition-transform active:scale-95 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
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
            className="fixed inset-0 z-40 flex flex-col justify-between bg-[#050505] px-6 pt-32 pb-10 md:hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />

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
                    className="group flex items-center justify-between border-b border-white/5 py-4 text-2xl font-bold text-zinc-400 transition-colors hover:text-white"
                  >
                    <span className="transition-transform duration-300 group-hover:translate-x-2">
                      {link.label}
                    </span>
                    <ChevronRight className="h-5 w-5 text-indigo-500 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2" />
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
              <div className="flex items-center gap-4 rounded-2xl border border-white/5 bg-zinc-900/50 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
                  <Command className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Life OS Mobile</p>
                  <p className="text-xs text-zinc-500">
                    Acesse de qualquer lugar.
                  </p>
                </div>
              </div>

              <Link
                href={cta.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full"
              >
                <Button className="h-14 w-full rounded-2xl bg-white text-lg font-bold text-black hover:bg-zinc-200 shadow-xl shadow-white/5">
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
