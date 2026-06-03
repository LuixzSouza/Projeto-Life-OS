// components/landing/timeline-section.tsx
"use client";

import { 
  Sun, 
  BrainCircuit, 
  Wallet, 
  Moon, 
  CheckCircle2, 
  LineChart 
} from "lucide-react";
import { motion } from "framer-motion";

// Tipagem para os itens da timeline
interface TimelineItem {
  time: string;
  icon: React.ElementType;
  color: string;
  module: string;
  title: string;
  desc: string;
}

const TIMELINE: TimelineItem[] = [
  { 
    time: "07:00", 
    icon: Sun, 
    color: "text-amber-400",
    module: "HEALTH & DASHBOARD",
    title: "Sincronização Biológica", 
    desc: "O dia começa com o registro de sono e humor (HealthMetric). O sistema calcula sua 'Bateria Social' e ajusta a dificuldade das tarefas sugeridas no Dashboard." 
  },
  { 
    time: "09:30", 
    icon: BrainCircuit, 
    color: "text-primary",
    module: "PROJECTS & FOCUS",
    title: "Deep Work Block", 
    desc: "Hora de focar. Você seleciona uma Tarefa de Alta Prioridade vinculada a um Projeto Ativo. O Timer Pomodoro inicia e o status muda para 'Em Foco'." 
  },
  { 
    time: "14:00", 
    icon: Wallet, 
    color: "text-emerald-400",
    module: "FINANCE",
    title: "Gestão de Ativos", 
    desc: "Pausa para o almoço e atualização financeira. Registro rápido de despesas (Transaction) e verificação do saldo das contas e meta do Wishlist." 
  },
  { 
    time: "21:00", 
    icon: Moon, 
    color: "text-primary",
    module: "AI & JOURNAL",
    title: "Fechamento Inteligente", 
    desc: "A IA (AiChat) analisa tudo o que foi feito, gasto e monitorado. Ela gera um resumo no seu Diário e sugere a preparação para amanhã." 
  },
];

export default function TimelineSection() {
  return (
    <section id="routine" className="py-32 px-6 border-t border-border bg-card relative overflow-hidden">
      
      {/* Background Decorativo */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        
        {/* Cabeçalho da Seção */}
        <div className="text-center mb-20 space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border text-muted-foreground text-xs font-mono uppercase tracking-widest"
          >
            <LineChart className="h-3 w-3" /> Life OS Routine
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-bold text-foreground"
          >
            Um dia na vida do seu <span className="text-primary">Sistema Operacional</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-muted-foreground max-w-lg mx-auto text-lg leading-relaxed"
          >
            Da hora que acorda até ir dormir, cada interação alimenta seu banco de dados local, gerando inteligência real sobre sua vida.
          </motion.p>
        </div>

        <div className="relative">
          {/* Linha Vertical Conectora (Trilha) */}
          <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-muted rounded-full">
             {/* Efeito de preenchimento ao rolar (Opcional, mas dá um toque premium) */}
             <div className="absolute top-0 w-full h-full bg-gradient-to-b from-primary/50 via-primary/20 to-transparent opacity-40" />
          </div>

          <div className="space-y-12">
            {TIMELINE.map((item, i) => (
              <TimelineCard key={i} item={item} index={i} />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}

// Componente Extraído para Limpeza e Tipagem
function TimelineCard({ item, index }: { item: TimelineItem; index: number }) {
    return (
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="relative flex gap-8 group"
        >
            {/* Ícone / Marcador na Timeline */}
            <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-card border border-border shadow-lg transition-all duration-300 group-hover:border-border group-hover:scale-110 group-hover:shadow-[0_0_20px_-5px_var(--color-primary)]">
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${item.color.replace('text-', 'bg-')}`} />
                <item.icon className={`h-6 w-6 transition-colors duration-300 ${item.color} opacity-80 group-hover:opacity-100`} />
            </div>

            {/* Card de Conteúdo */}
            <div className="flex-1 pt-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                    {/* Hora */}
                    <span className="text-sm font-mono text-foreground/90 font-bold bg-muted/50 px-2 py-0.5 rounded border border-border">
                        {item.time}
                    </span>
                    
                    {/* Badge do Módulo */}
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {item.module}
                    </span>
                </div>

                {/* Card visual */}
                <div className="p-5 rounded-xl border border-border bg-card/20 hover:bg-card/40 transition-colors group-hover:border-border">
                    <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {item.desc}
                    </p>
                </div>
            </div>
        </motion.div>
    )
}