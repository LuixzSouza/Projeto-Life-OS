import {
  LayoutDashboard, Wallet, BookOpen, Dumbbell, Briefcase, Calendar,
  Globe, Settings, BrainCircuit, Lock, Bookmark, Film, Users, Shirt, Home,
  BriefcaseBusiness, ClipboardList, History, Trash2, Network, NotebookPen,
  CalendarRange
} from "lucide-react";
import type { SidebarGroup, SidebarItem } from "./sidebar-types";

/**
 * Rota ativa de forma inteligente: casa exatamente OU quando a rota atual é
 * uma sub-rota do href (ex.: /health/nutrition ativa /health).
 */
export function isActiveRoute(pathname: string | null | undefined, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

/** Um item está ativo se a própria rota casa OU se algum sub-item casa. */
export function isItemActive(pathname: string | null | undefined, item: SidebarItem): boolean {
  if (isActiveRoute(pathname, item.href)) return true;
  return item.subItems?.some((sub) => isActiveRoute(pathname, sub.href)) ?? false;
}

// --- DADOS ORGANIZADOS COM SUB-LINKS ---
export const groupedSidebarItems: SidebarGroup[] = [
  {
    groupName: "Central",
    items: [
      { label: "Visão Geral", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Agenda", icon: Calendar, href: "/agenda" },
      { label: "Linha do Tempo", icon: History, href: "/timeline" },
      { label: "Retrospectiva", icon: CalendarRange, href: "/review" },
      { label: "Tags & Anexos", icon: Network, href: "/connect" },
      { label: "Assistente IA", icon: BrainCircuit, href: "/ai" },
    ]
  },
  {
    groupName: "Profissional",
    items: [
      { label: "Projetos", icon: Briefcase, href: "/projects" },
      { label: "Vagas", icon: ClipboardList, href: "/jobs" },
      { label: "Negócios", icon: BriefcaseBusiness, href: "/business" },
      { label: "Financeiro", icon: Wallet, href: "/finance", subItems: [{ label: "Investmentos", href: "/finance/investments" },{ label: "Mercado Financeiro", href: "/finance/market" },{ label: "Transações", href: "/finance/transactions" },] },
    ]
  },
  {
    groupName: "Pessoal",
    items: [
      {
        label: "Saúde",
        icon: Dumbbell,
        href: "/health",
        subItems: [
          { label: "Treino", href: "/health/gym" },
          { label: "Corrida", href: "/health/running" },
          { label: "Nutrição", href: "/health/nutrition" },
          { label: "Sono", href: "/health/sleep" },
          { label: "Corpo", href: "/health/body" },
        ]
      },
      { label: "Notas", icon: NotebookPen, href: "/notes" },
      { label: "Estudos", icon: BookOpen, href: "/studies", subItems: [{ label: "Metas", href: "/goals" }, { label: "Flash Cards", href: "/flashcards" }] },
      { label: "Entretenimento", icon: Film, href: "/entertainment" },
      { label: "Closet", icon: Shirt, href: "/wardrobe" },
      { label: "Conexões", icon: Users, href: "/social" },
    ]
  },
  {
    groupName: "Sistema",
    items: [
      { label: "Sites & CMS", icon: Globe, href: "/cms" },
      { label: "Links & Apps", icon: Bookmark, href: "/links" },
      { label: "Acessos", icon: Lock, href: "/access" },
      { label: "Lixeira", icon: Trash2, href: "/trash" },
      { label: "Configurações", icon: Settings, href: "/settings" },
    ]
  }
];

export const mobileNavItems = [
  { label: "Início", icon: Home, href: "/dashboard" },
  { label: "Agenda", icon: Calendar, href: "/agenda" },
  { label: "IA", icon: BrainCircuit, href: "/ai" },
  { label: "Config", icon: Settings, href: "/settings" },
];
