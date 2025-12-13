"use client";

import { 
  Bot, 
  Sparkles, 
  Zap, 
  HardDrive, 
  ArrowUp, 
  LucideIcon
} from "lucide-react";
import { BaseCard } from "./base-card";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- TIPAGEM ESTRITA (Zero 'any') ---

type ProviderKey = "ollama" | "openai" | "groq" | "google";

interface ProviderStyle {
    id: ProviderKey;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
}

interface Message {
    role: "user" | "assistant";
    content: string;
}

interface Scenario {
    provider: ProviderKey;
    query: string;
    response: string;
}

// --- CONFIGURAÇÃO VISUAL ---

const PROVIDER_STYLES: Record<ProviderKey, ProviderStyle> = {
    ollama: {
        id: "ollama",
        label: "Ollama (Local)",
        icon: HardDrive, 
        color: "text-zinc-400",
        bgColor: "bg-zinc-800",
        borderColor: "border-zinc-700"
    },
    openai: {
        id: "openai",
        label: "GPT-4o",
        icon: Bot, 
        color: "text-emerald-400",
        bgColor: "bg-emerald-950/40",
        borderColor: "border-emerald-800"
    },
    groq: {
        id: "groq",
        label: "Groq (Fast)",
        icon: Zap, 
        color: "text-orange-400",
        bgColor: "bg-orange-950/40",
        borderColor: "border-orange-800"
    },
    google: {
        id: "google",
        label: "Gemini Pro",
        icon: Sparkles, 
        color: "text-blue-400",
        bgColor: "bg-blue-950/40",
        borderColor: "border-blue-800"
    }
};

const SCENARIOS: Scenario[] = [
  {
    provider: "ollama",
    query: "Analise meu banco SQL local 'finance.db'. Gastos do mês?",
    response: `🔒 **Análise Local (Privacidade Garantida):**

Acessei seu banco de dados.

* **Total Gasto:** R$ 3.450,00
* **Maior Categoria:** Infraestrutura (AWS/Vercel)
* **Status:** Dentro do orçamento previsto.`
  },
  {
    provider: "groq",
    query: "Refatore este componente para usar Server Actions.",
    response: `⚡ **Refatoração Rápida:**

Aqui está a versão otimizada:

\`\`\`tsx
async function submitData(formData: FormData) {
  'use server'
  await db.posts.create({
    data: { title: formData.get('title') }
  })
}
\`\`\``
  },
  {
    provider: "openai",
    query: "Crie um plano de treino baseado na minha recuperação (85%).",
    response: `💪 **Plano de Alta Intensidade:**

Sua recuperação está ótima. Vamos focar em força hoje.

1. **Supino Reto:** 5x5 (Carga Máxima)
2. **Agachamento:** 4x8
3. **Barra Fixa:** 3x Falha

*Hidratação recomendada: 3L hoje.*`
  }
];

export function AICard() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [step, setStep] = useState(0); // 0: Digitando, 1: Enviando, 2: Pensando, 3: Respondendo
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  
  const currentScenario = SCENARIOS[scenarioIndex];
  const currentStyle = PROVIDER_STYLES[currentScenario.provider];
  const CurrentIcon = currentStyle.icon;

  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // Limpeza de timeouts ao desmontar
  useEffect(() => {
    return () => timeouts.current.forEach(clearTimeout);
  }, []);

  // --- ORQUESTRAÇÃO DO LOOP ---
  useEffect(() => {
    const runSequence = async () => {
      // 1. Digitação do Usuário
      if (step === 0) {
        setMessages([]); 
        const text = currentScenario.query;
        let i = 0;
        
        const type = () => {
          if (i <= text.length) {
            setInputText(text.slice(0, i));
            i++;
            timeouts.current.push(setTimeout(type, 40));
          } else {
            timeouts.current.push(setTimeout(() => setStep(1), 600));
          }
        };
        type();
      }

      // 2. Enviar (Simula clique)
      if (step === 1) {
        setMessages([{ role: "user", content: currentScenario.query }]);
        setInputText("");
        setStep(2);
      }

      // 3. Pensando (Loading State)
      if (step === 2) {
        const thinkTime = currentScenario.provider === 'groq' ? 800 : 2000;
        timeouts.current.push(setTimeout(() => setStep(3), thinkTime));
      }

      // 4. Respondendo (Streaming)
      if (step === 3) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        const fullText = currentScenario.response;
        let c = 0;

        const stream = () => {
          if (c <= fullText.length) {
            const isCode = fullText.includes("```") && c > fullText.indexOf("```");
            const speed = isCode ? 5 : 20; 
            
            setMessages(prev => {
              const newArr = [...prev];
              newArr[newArr.length - 1] = {
                  ...newArr[newArr.length - 1],
                  content: fullText.slice(0, c)
              };
              return newArr;
            });
            c++;
            timeouts.current.push(setTimeout(stream, speed));
          } else {
            // Fim -> Próximo cenário
            timeouts.current.push(setTimeout(() => {
              setScenarioIndex(prev => (prev + 1) % SCENARIOS.length);
              setStep(0);
            }, 5000));
          }
        };
        stream();
      }
    };

    runSequence();
  }, [step, scenarioIndex, currentScenario.query, currentScenario.response, currentScenario.provider]);

  return (
    <BaseCard
      title="Inteligência Híbrida"
      description="Orquestração automática de modelos."
      icon={Bot}
      className="col-span-2 row-span-2 h-full"
    >
      <div className="flex flex-col h-full bg-[#09090b] relative overflow-hidden font-sans">
        
        {/* --- NOVO: HUD SUPERIOR (MOSTRA TODAS AS IAs) --- */}
        <div className="absolute top-0 inset-x-0 p-3 flex justify-center z-20 bg-gradient-to-b from-[#09090b] to-transparent">
            <div className="flex items-center gap-2 p-1.5 rounded-full bg-zinc-900/80 border border-white/5 backdrop-blur-md shadow-xl">
                {(Object.keys(PROVIDER_STYLES) as ProviderKey[]).map((key) => {
                    const style = PROVIDER_STYLES[key];
                    const Icon = style.icon;
                    const isActive = currentScenario.provider === key;
                    
                    return (
                        <div 
                            key={key}
                            className={cn(
                                "relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500",
                                isActive ? cn(style.bgColor, "scale-110 shadow-lg") : "opacity-30 hover:opacity-50"
                            )}
                        >
                            <Icon className={cn("w-3.5 h-3.5", isActive ? style.color : "text-zinc-400")} />
                            {isActive && (
                                <span className={cn("absolute -bottom-1 w-1 h-1 rounded-full", style.color.replace("text-", "bg-"))} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>

        {/* --- MARCA D'ÁGUA DINÂMICA --- */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            <CurrentIcon 
                className={cn(
                    "w-[300px] h-[300px] opacity-[0.03] -rotate-12 transition-colors duration-700", 
                    currentStyle.color
                )} 
            />
        </div>

        {/* --- ÁREA DE CHAT --- */}
        <div className="flex-1 p-4 pt-14 flex flex-col gap-4 overflow-hidden relative z-10">
            
            {/* Mensagens */}
            <AnimatePresence mode="popLayout">
                {messages.map((msg, idx) => (
                    <motion.div 
                        key={`${scenarioIndex}-${idx}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex w-full gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                    >
                        {/* Avatar */}
                        <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border transition-colors duration-500",
                            msg.role === "assistant" 
                                ? cn(currentStyle.bgColor, currentStyle.borderColor)
                                : "bg-zinc-800 border-zinc-700"
                        )}>
                            {msg.role === "assistant" ? (
                                <CurrentIcon className={cn("h-4 w-4", currentStyle.color)} />
                            ) : (
                                <div className="h-4 w-4 text-zinc-400" /> 
                            )}
                        </div>

                        {/* Balão */}
                        <div className={cn(
                            "flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed transition-colors duration-500",
                            msg.role === "user" 
                                ? "bg-zinc-800 text-white rounded-tr-none" 
                                : "bg-transparent text-zinc-300 border border-zinc-800 rounded-tl-none"
                        )}>
                            <div className="whitespace-pre-wrap">
                                {msg.content.split("```").map((part: string, i: number) => {
                                    if (i % 2 === 1) { // Código
                                        return (
                                            <div key={i} className="my-2 rounded bg-[#111] border border-white/10 p-2 font-mono text-[10px] text-emerald-400 overflow-x-hidden">
                                                {part.replace(/^tsx\n|^js\n/, "")}
                                            </div>
                                        );
                                    }
                                    // Negrito (Simples)
                                    const parts = part.split(/(\*\*.*?\*\*)/g);
                                    return (
                                        <span key={i}>
                                            {parts.map((p, j) => 
                                                p.startsWith("**") ? <strong key={j} className="text-white font-semibold">{p.replace(/\*\*/g, "")}</strong> : p
                                            )}
                                        </span>
                                    );
                                })}
                                {/* Cursor */}
                                {step === 3 && idx === messages.length - 1 && (
                                    <span className={cn("inline-block w-1.5 h-3 ml-0.5 align-middle animate-pulse", currentStyle.color.replace("text-", "bg-"))}/>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>

            {/* Loading Indicator (3 dots) */}
            {step === 2 && (
                 <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex gap-3 w-full"
                >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 border", currentStyle.bgColor, currentStyle.borderColor)}>
                        <CurrentIcon className={cn("h-4 w-4 animate-pulse", currentStyle.color)} />
                    </div>
                    <div className="flex items-center gap-1 bg-zinc-900 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-800 w-fit">
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.3s]", currentStyle.color.replace("text-", "bg-"))}></span>
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce [animation-delay:-0.15s]", currentStyle.color.replace("text-", "bg-"))}></span>
                        <span className={cn("w-1.5 h-1.5 rounded-full animate-bounce", currentStyle.color.replace("text-", "bg-"))}></span>
                    </div>
                </motion.div>
            )}
        </div>

        {/* --- INPUT AREA --- */}
        <div className="p-4 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent pt-8 z-20">
            <div className="relative">
                
                {/* A "Pílula" (Badge) flutuante acima do input */}
                <div className="flex justify-center mb-2">
                    <span className={cn(
                        "text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full border bg-black/80 backdrop-blur shadow-sm transition-colors duration-500 flex items-center gap-1.5",
                        currentStyle.color,
                        currentStyle.borderColor
                    )}>
                        <CurrentIcon className="w-3 h-3" />
                        {currentStyle.label}
                    </span>
                </div>

                {/* O Input Container */}
                <div className={cn(
                    "flex items-center gap-2 bg-[#09090b] border rounded-2xl p-1.5 shadow-lg transition-all duration-500",
                    currentStyle.borderColor
                )}>
                    <input 
                        disabled
                        placeholder={`Pergunte ao ${currentStyle.label.split(" ")[0]}...`} 
                        value={inputText}
                        className="flex-1 bg-transparent border-none outline-none text-xs text-zinc-200 px-3 placeholder:text-zinc-600 font-medium h-9"
                    />
                    <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center transition-all shrink-0",
                        inputText.length > 0 
                            ? "bg-white text-black shadow-md scale-100" 
                            : "bg-zinc-800 text-zinc-600"
                    )}>
                        <ArrowUp className="h-4 w-4" />
                    </div>
                </div>
            </div>
        </div>

      </div>
    </BaseCard>
  );
}