// components/landing/timeline-section.tsx
"use client";

import { Sun, Coffee, Briefcase, Moon, PenTool } from "lucide-react";
import { motion } from "framer-motion";

const TIMELINE = [
  { 
    time: "07:30", 
    icon: Sun, 
    title: "Input Matinal", 
    desc: "Você acorda e registra rapidamente como foi sua noite. Baseado no seu input de energia, o sistema sugere a carga de tarefas ideal para hoje." 
  },
  { 
    time: "09:00", 
    icon: Briefcase, 
    title: "Gestão de Foco", 
    desc: "No módulo de Projetos, você seleciona a prioridade do dia. O Timer Pomodoro é ativado para garantir 2 horas de trabalho sem interrupções." 
  },
  { 
    time: "18:00", 
    icon: Coffee, 
    title: "Registro de Hábitos", 
    desc: "Fim do expediente. Hora de marcar o 'check' nos hábitos (Leitura, Treino) e atualizar o status das tarefas no Kanban." 
  },
  { 
    time: "22:00", 
    icon: Moon, 
    title: "Review Diário", 
    desc: "Você lança os gastos do dia no Financeiro e escreve no Diário. O sistema compila tudo e gera seu gráfico de produtividade do dia." 
  },
];

export default function TimelineSection() {
  return (
    <section className="py-32 px-6 border-t border-white/5 bg-[#09090b]">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Sua rotina, organizada.</h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            O Life OS não faz o trabalho por você, mas garante que você tenha clareza total sobre onde está investindo seu tempo e dinheiro.
          </p>
        </div>

        <div className="relative">
          {/* Linha Vertical Conectora */}
          <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-zinc-800 via-indigo-900/50 to-zinc-800" />

          <div className="space-y-16">
            {TIMELINE.map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex gap-8 group"
              >
                {/* Ícone na Linha (Timeline Marker) */}
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 shadow-xl transition-colors duration-500 group-hover:border-indigo-500/50 group-hover:bg-zinc-800">
                  <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <item.icon className="h-6 w-6 text-zinc-400 group-hover:text-indigo-400 transition-colors duration-300" />
                </div>

                {/* Conteúdo */}
                <div className="pt-1">
                  <span className="text-xs font-mono text-indigo-500 font-bold tracking-widest uppercase mb-1 block">
                    {item.time}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-200 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-zinc-400 leading-relaxed max-w-lg text-sm border-l-2 border-zinc-800 pl-4 group-hover:border-zinc-700 transition-colors">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}