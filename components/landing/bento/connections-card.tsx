"use client";

import { Users, Plus, Heart, Briefcase, Calendar, Gift, Search, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

// model Friend: name, proximity, birthday, notes, giftIdeas, tags.
type RelationType = "family" | "friend" | "work";

interface Contact {
  id: string;
  name: string;
  relation: RelationType;
  role: string;
  birthday: string;
  notes: string;
  initials: string;
  upcoming?: boolean;
}

const CONTACTS: Contact[] = [
  { id: "1", name: "Marcão", relation: "friend", role: "Parceiro de código", birthday: "12/Out", notes: "Gosta de teclados mecânicos. Projeto: Vacina.", initials: "MC", upcoming: true },
  { id: "2", name: "Mãe", relation: "family", role: "Família", birthday: "05/Mai", notes: "Comprar flores brancas. Consulta dia 20.", initials: "MÃ" },
  { id: "3", name: "Ana Clara", relation: "work", role: "Cliente (Estética)", birthday: "28/Set", notes: "Prefere contato via WhatsApp. Marca: Rosa.", initials: "AC" },
  { id: "4", name: "Lucas (Tio)", relation: "family", role: "Tio do interior", birthday: "15/Dez", notes: "Torce pro Santos. Levar vinho no Natal.", initials: "LC" },
];

const RELATION_ICON: Record<RelationType, LucideIcon> = {
  family: Heart,
  work: Briefcase,
  friend: Users,
};

export function ConnectionsCard() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const active = CONTACTS.find((c) => c.id === hoveredId);

  return (
    <BaseCard title="Conexões" icon={Users} description="CRM pessoal e família." className="col-span-1 min-h-[260px]">
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        {/* Busca */}
        <div className="px-3 pb-2 pt-3">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-2 py-1.5">
            <Search className="size-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Buscar pessoa…</span>
          </div>
        </div>

        {/* Lista */}
        <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-2 pb-20">
          {CONTACTS.map((contact) => {
            const RIcon = RELATION_ICON[contact.relation];
            return (
              <motion.div
                key={contact.id}
                onMouseEnter={() => setHoveredId(contact.id)}
                onMouseLeave={() => setHoveredId(null)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border border-transparent p-2 transition-all duration-300",
                  hoveredId === contact.id ? "border-primary/20 bg-primary/5" : "hover:bg-primary/5"
                )}
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-[10px] font-bold text-primary">
                  {contact.initials}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-xs font-bold text-foreground">{contact.name}</span>
                    {contact.upcoming && (
                      <span className="flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold text-primary">
                        <Gift className="size-2.5" /> Niver
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <RIcon className="size-3 text-primary" />
                    <span className="truncate text-[9px] text-muted-foreground">{contact.role}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 py-2 text-[10px] text-muted-foreground transition-all hover:border-primary/40 hover:text-foreground">
            <Plus className="size-3" /> Adicionar pessoa
          </button>
        </div>

        {/* Painel de detalhes */}
        <div className="absolute inset-x-0 bottom-0 h-[85px] border-t border-border/60 bg-card/95 p-3 backdrop-blur">
          <AnimatePresence mode="wait">
            {active ? (
              <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex h-full flex-col justify-center gap-2">
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1.5 rounded border border-border/60 bg-card px-2 py-1">
                    <Calendar className="size-3 text-primary" />
                    <span>{active.birthday}</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded border border-border/60 bg-card px-2 py-1">
                    <Phone className="size-3 text-primary" />
                    <span>Ligar</span>
                  </div>
                </div>
                <div className="border-l-2 border-primary/40 pl-2 text-[10px] italic leading-snug text-foreground">
                  &quot;{active.notes}&quot;
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center gap-2 text-muted-foreground">
                <Users className="size-4" />
                <span className="text-[10px]">Passe o mouse para ver detalhes</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BaseCard>
  );
}
