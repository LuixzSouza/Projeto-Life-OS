"use client";

import { Bot, Sparkles, Zap, HardDrive, ArrowUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// model Settings.aiProvider + AiChat/AiMessage. IA híbrida: local (Ollama) + nuvem.
type ProviderKey = "ollama" | "openai" | "groq" | "google";

interface Provider {
  label: string;
  icon: LucideIcon;
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

const PROVIDERS: Record<ProviderKey, Provider> = {
  ollama: { label: "Ollama · Local", icon: HardDrive },
  openai: { label: "GPT-4o", icon: Bot },
  groq: { label: "Groq", icon: Zap },
  google: { label: "Gemini", icon: Sparkles },
};

const SCENARIOS: Scenario[] = [
  {
    provider: "ollama",
    query: "Analise meu banco local 'life-os.db'. Gastos do mês?",
    response: `🔒 **Análise 100% local (privacidade garantida):**

* **Total gasto:** R$ 3.450
* **Maior categoria:** Infra (AWS/Vercel)
* **Status:** dentro do orçamento.`,
  },
  {
    provider: "groq",
    query: "Refatore este componente para Server Actions.",
    response: `⚡ **Refatoração rápida:**

\`\`\`tsx
async function submitData(formData: FormData) {
  'use server'
  await db.posts.create({
    data: { title: formData.get('title') }
  })
}
\`\`\``,
  },
  {
    provider: "openai",
    query: "Plano de treino com base na recuperação (85%).",
    response: `💪 **Treino de alta intensidade:**

1. **Supino reto:** 5x5
2. **Agachamento:** 4x8
3. **Barra fixa:** 3x falha

*Hidratação: 3L hoje.*`,
  },
];

export function AICard() {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [step, setStep] = useState(0); // 0 digitando, 1 enviar, 2 pensando, 3 respondendo
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const scenario = SCENARIOS[scenarioIndex];
  const provider = PROVIDERS[scenario.provider];
  const CurrentIcon = provider.icon;
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const list = timeouts.current;
    return () => list.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (step === 0) {
      setMessages([]);
      const text = scenario.query;
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
    if (step === 1) {
      setMessages([{ role: "user", content: scenario.query }]);
      setInputText("");
      setStep(2);
    }
    if (step === 2) {
      const thinkTime = scenario.provider === "groq" ? 700 : 1600;
      timeouts.current.push(setTimeout(() => setStep(3), thinkTime));
    }
    if (step === 3) {
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const fullText = scenario.response;
      let c = 0;
      const stream = () => {
        if (c <= fullText.length) {
          const isCode = fullText.includes("```") && c > fullText.indexOf("```");
          setMessages((prev) => {
            const arr = [...prev];
            arr[arr.length - 1] = { ...arr[arr.length - 1], content: fullText.slice(0, c) };
            return arr;
          });
          c++;
          timeouts.current.push(setTimeout(stream, isCode ? 5 : 18));
        } else {
          timeouts.current.push(
            setTimeout(() => {
              setScenarioIndex((p) => (p + 1) % SCENARIOS.length);
              setStep(0);
            }, 4000)
          );
        }
      };
      stream();
    }
  }, [step, scenarioIndex, scenario.query, scenario.response, scenario.provider]);

  return (
    <BaseCard title="Assistente IA" description="IA híbrida: local + nuvem." icon={Bot} className="col-span-2 row-span-2 h-full">
      <div className="relative flex h-full flex-col overflow-hidden font-sans">
        {/* HUD: provedores disponíveis */}
        <div className="absolute inset-x-0 top-0 z-20 flex justify-center bg-gradient-to-b from-card to-transparent p-3">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-xl backdrop-blur-md">
            {(Object.keys(PROVIDERS) as ProviderKey[]).map((key) => {
              const Icon = PROVIDERS[key].icon;
              const isActive = scenario.provider === key;
              return (
                <div
                  key={key}
                  className={cn(
                    "relative grid size-7 place-items-center rounded-full transition-all duration-500",
                    isActive ? "scale-110 bg-primary/15 text-primary shadow-lg" : "text-muted-foreground opacity-40"
                  )}
                >
                  <Icon className="size-3.5" />
                  {isActive && <span className="absolute -bottom-1 size-1 rounded-full bg-primary" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Marca d'água do provedor ativo */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <CurrentIcon className="size-[300px] -rotate-12 text-primary opacity-[0.03] transition-all duration-700" />
        </div>

        {/* Chat */}
        <div className="relative z-10 flex flex-1 flex-col gap-4 overflow-hidden p-4 pt-14">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, idx) => (
              <motion.div
                key={`${scenarioIndex}-${idx}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex w-full gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
              >
                <div
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border",
                    msg.role === "assistant" ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {msg.role === "assistant" ? <CurrentIcon className="size-4" /> : <div className="size-4" />}
                </div>

                <div
                  className={cn(
                    "flex max-w-[85%] flex-col rounded-2xl px-4 py-2.5 text-xs leading-relaxed",
                    msg.role === "user" ? "rounded-tr-none bg-muted text-foreground" : "rounded-tl-none border border-border/60 bg-transparent text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap">
                    {msg.content.split("```").map((part, i) => {
                      if (i % 2 === 1) {
                        return (
                          <div key={i} className="my-2 overflow-x-hidden rounded border border-border/60 bg-card p-2 font-mono text-[10px] text-primary">
                            {part.replace(/^tsx\n|^js\n/, "")}
                          </div>
                        );
                      }
                      const parts = part.split(/(\*\*.*?\*\*)/g);
                      return (
                        <span key={i}>
                          {parts.map((p, j) =>
                            p.startsWith("**") ? (
                              <strong key={j} className="font-semibold text-foreground">
                                {p.replace(/\*\*/g, "")}
                              </strong>
                            ) : (
                              p
                            )
                          )}
                        </span>
                      );
                    })}
                    {step === 3 && idx === messages.length - 1 && (
                      <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {step === 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex w-full gap-3">
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <CurrentIcon className="size-4 animate-pulse" />
              </div>
              <div className="flex w-fit items-center gap-1 rounded-2xl rounded-tl-none border border-border/60 bg-card px-4 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-primary" />
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="z-20 bg-gradient-to-t from-card via-card to-transparent p-4 pt-8">
          <div className="mb-2 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-primary backdrop-blur">
              <CurrentIcon className="size-3" />
              {provider.label}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card p-1.5 shadow-lg">
            <input
              disabled
              placeholder={`Pergunte ao ${provider.label.split(" ")[0]}…`}
              value={inputText}
              className="h-9 flex-1 border-none bg-transparent px-3 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-xl transition-all",
                inputText.length > 0 ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
              )}
            >
              <ArrowUp className="size-4" />
            </div>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
