"use client";

// Banner global de banco fora do ar (DATABASE_ROADMAP · Resiliência §1/§4):
// com banco remoto, "wifi caiu / free tier hibernou / quota estourou" vira
// rotina — em vez de cada página estourar um erro genérico, este banner avisa
// UMA vez, no topo, e some sozinho quando a conexão volta. Cobre dois estados:
//  - vermelho: banco/servidor fora do ar (nada salva, nada lê);
//  - âmbar: SOMENTE LEITURA — a leitura funciona mas a escrita falhou
//    (disco cheio ou limite do plano grátis atingido).
// Usa o mesmo poller do indicador da sidebar.

import { useState } from "react";
import { WifiOff, RefreshCw, PencilOff } from "lucide-react";
import { useDbHealth, levelOf, recheckDbHealth } from "./use-db-health";

export function DbDownBanner() {
  const snap = useDbHealth();
  const [retrying, setRetrying] = useState(false);

  const level = levelOf(snap);
  const readOnly = level !== "down" && snap.health?.writable === false;
  // Só aparece em problema CONFIRMADO (a 1ª checagem ainda não concluída fica muda).
  if (level !== "down" && !readOnly) return null;

  const serverDown = snap.failed;

  const handleRetry = () => {
    setRetrying(true);
    recheckDbHealth();
    // O store emite quando a checagem termina; o spin é só feedback imediato.
    window.setTimeout(() => setRetrying(false), 1200);
  };

  const tone = readOnly
    ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
    : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400";
  const buttonTone = readOnly
    ? "bg-amber-500/15 hover:bg-amber-500/25"
    : "bg-rose-500/15 hover:bg-rose-500/25";

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-2 pointer-events-none">
      <div className={`pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-1.5 text-xs shadow-lg backdrop-blur ${tone}`}>
        {readOnly ? <PencilOff className="h-3.5 w-3.5 shrink-0" /> : <WifiOff className="h-3.5 w-3.5 shrink-0" />}
        <span className="font-medium">
          {readOnly
            ? "Banco em modo somente leitura — a escrita falhou (disco cheio ou limite do plano grátis). Seus dados estão visíveis, mas alterações não salvam."
            : serverDown
              ? "Servidor inacessível — verifique se o PC com o Life OS está ligado e na rede."
              : "Sem conexão com o banco de dados — alterações não estão sendo salvas."}
        </span>
        <button
          type="button"
          onClick={handleRetry}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition-colors ${buttonTone}`}
        >
          <RefreshCw className={retrying ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
          Tentar agora
        </button>
      </div>
    </div>
  );
}
