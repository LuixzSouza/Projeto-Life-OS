"use client";

import { Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Limpa o texto para a fala: tira blocos de código, URLs e espaços extras. */
function speakableText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Botão de áudio: lê o texto do cartão em voz alta com a Web Speech API (nativa
 * do navegador — sem dependência, sem nuvem). Útil para idiomas, pronúncia e
 * acessibilidade. Prefere uma voz pt-BR quando existir. Esconde-se sozinho se o
 * navegador não suportar síntese de voz.
 */
export function SpeakButton({
  text,
  lang = "pt-BR",
  className,
}: {
  text?: string | null;
  lang?: string;
  className?: string;
}) {
  // Renderiza com base no texto (igual no server e no client → sem mismatch de
  // hidratação). O suporte à Web Speech API é checado no clique.
  if (!text || !speakableText(text)) return null;

  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const clean = speakableText(text);
    if (!clean) return;
    synth.cancel(); // interrompe qualquer fala anterior
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = lang;
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang.slice(0, 2).toLowerCase()));
    if (voice) utt.voice = voice;
    synth.speak(utt);
  };

  return (
    <button
      type="button"
      onClick={handleSpeak}
      title="Ouvir em voz alta"
      aria-label="Ouvir o texto do cartão em voz alta"
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary",
        className,
      )}
    >
      <Volume2 className="h-5 w-5" />
    </button>
  );
}
