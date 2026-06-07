"use client";

import {
  Calendar, Utensils, Dumbbell, BookOpen, Moon, Scale, Film, Shirt,
  UserPlus, Cake, Wallet, Briefcase, CheckSquare, Flame, Users, Receipt, Repeat, Layers, Target, PartyPopper, HandCoins,
} from "lucide-react";
import type { AgendaIconKey } from "./agenda-shared";

const ICONS: Record<AgendaIconKey, React.ElementType> = {
  calendar: Calendar,
  utensils: Utensils,
  dumbbell: Dumbbell,
  book: BookOpen,
  moon: Moon,
  scale: Scale,
  film: Film,
  shirt: Shirt,
  userplus: UserPlus,
  cake: Cake,
  wallet: Wallet,
  briefcase: Briefcase,
  check: CheckSquare,
  flame: Flame,
  users: Users,
  receipt: Receipt,
  repeat: Repeat,
  layers: Layers,
  target: Target,
  party: PartyPopper,
  handcoins: HandCoins,
};

export function AgendaItemIcon({ icon, className }: { icon: AgendaIconKey; className?: string }) {
  const Icon = ICONS[icon] ?? Calendar;
  return <Icon className={className} />;
}
