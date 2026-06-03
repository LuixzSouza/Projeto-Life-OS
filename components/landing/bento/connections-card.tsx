"use client";

import { Users, Plus, Heart, Briefcase, Calendar, Gift, Search, Phone } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

// --- TIPAGEM ESTRITA ---
type RelationType = "family" | "friend" | "work";

interface Contact {
  id: string;
  name: string;
  relation: RelationType;
  role: string; // Ex: "Primo", "Designer", "Melhor Amigo"
  birthday: string;
  notes: string; // O dado útil (ex: "Gosta de Vinho", "Filho: Pedro")
  initials: string;
  color: string;
  isUpcomingBirthday?: boolean; // Se o aniversário está perto
}

// --- DADOS MOCKADOS (Seu "Banco de Pessoas") ---
const CONTACTS: Contact[] = [
  { 
    id: "1", 
    name: "Marcão", 
    relation: "friend", 
    role: "Parceiro de Código", 
    birthday: "12/Out", 
    notes: "Gosta de teclados mecânicos. Projeto: Vacina.",
    initials: "MC",
    color: "bg-indigo-500",
    isUpcomingBirthday: true
  },
  { 
    id: "2", 
    name: "Mãe", 
    relation: "family", 
    role: "Família", 
    birthday: "05/Mai", 
    notes: "Comprar flores brancas. Consulta médica dia 20.",
    initials: "MÃ",
    color: "bg-rose-500"
  },
  { 
    id: "3", 
    name: "Ana Clara", 
    relation: "work", 
    role: "Cliente (Estética)", 
    birthday: "28/Set", 
    notes: "Prefere contato via WhatsApp. Cor da marca: Rosa.",
    initials: "AC",
    color: "bg-emerald-500"
  },
  { 
    id: "4", 
    name: "Lucas (Tio)", 
    relation: "family", 
    role: "Tio do Interior", 
    birthday: "15/Dez", 
    notes: "Torce para o Santos. Levar vinho no Natal.",
    initials: "LC",
    color: "bg-amber-500"
  },
];

export function ConnectionsCard() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  
  // Encontra o contato focado ou null
  const activeContact = CONTACTS.find(c => c.id === hoveredId);

  // Ícone baseado na relação
  const getRelationIcon = (type: RelationType) => {
    switch (type) {
      case "family": return <Heart className="h-3 w-3 text-rose-400 fill-rose-400/20" />;
      case "work": return <Briefcase className="h-3 w-3 text-emerald-400" />;
      default: return <Users className="h-3 w-3 text-indigo-400" />;
    }
  };

  return (
    <BaseCard 
        title="Meus Contatos" 
        icon={Users} 
        description="CRM Pessoal & Família."
        className="col-span-1 min-h-[260px]"
    >
        <div className="flex flex-col h-full w-full bg-card relative overflow-hidden">
            
            {/* --- SEARCH BAR (Decorativa) --- */}
            <div className="px-3 pt-3 pb-2">
                <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-2 py-1.5">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Buscar familiar ou amigo...</span>
                </div>
            </div>

            {/* --- LISTA DE CONTATOS (Scroll) --- */}
            <div className="flex-1 overflow-y-auto px-2 pb-20 space-y-1 custom-scrollbar">
                {CONTACTS.map((contact) => (
                    <motion.div
                        key={contact.id}
                        onMouseEnter={() => setHoveredId(contact.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-xl cursor-pointer border border-transparent transition-all duration-300",
                            hoveredId === contact.id ? "bg-foreground/5 border-border" : "hover:bg-foreground/5"
                        )}
                    >
                        {/* Avatar */}
                        <div className={cn(
                            "h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-bold text-foreground shadow-lg shrink-0",
                            contact.color
                        )}>
                            {contact.initials}
                        </div>

                        {/* Info Principal */}
                        <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-foreground truncate">{contact.name}</span>
                                {contact.isUpcomingBirthday && (
                                    <div className="flex items-center gap-1 bg-rose-500/10 px-1.5 py-0.5 rounded text-[8px] text-rose-400 font-bold border border-rose-500/20">
                                        <Gift className="h-2.5 w-2.5" /> Niver
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                {getRelationIcon(contact.relation)}
                                <span className="text-[9px] text-muted-foreground truncate">{contact.role}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
                
                {/* Botão Adicionar */}
                <button className="w-full py-2 flex items-center justify-center gap-2 border border-dashed border-border rounded-xl text-[10px] text-muted-foreground hover:text-muted-foreground hover:border-border transition-all">
                    <Plus className="h-3 w-3" /> Adicionar Pessoa
                </button>
            </div>

            {/* --- PAINEL DE DETALHES (RODAPÉ FIXO) --- */}
            {/* Esse painel muda dinamicamente quando passa o mouse */}
            <div className="absolute bottom-0 inset-x-0 h-[85px] bg-card border-t border-border p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                <AnimatePresence mode="wait">
                    {activeContact ? (
                        <motion.div
                            key="details"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="flex flex-col gap-2 h-full justify-center"
                        >
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded border border-border">
                                    <Calendar className="h-3 w-3 text-indigo-400" /> 
                                    <span>{activeContact.birthday}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-card px-2 py-1 rounded border border-border">
                                    <Phone className="h-3 w-3 text-emerald-400" /> 
                                    <span>Ligar</span>
                                </div>
                            </div>
                            <div className="text-[10px] text-foreground italic leading-snug border-l-2 border-border pl-2">
                                &quot;{activeContact.notes}&quot;
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full flex items-center justify-center gap-2 text-muted-foreground"
                        >
                            <Users className="h-4 w-4" />
                            <span className="text-[10px]">Passe o mouse para ver detalhes</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </div>
    </BaseCard>
  );
}