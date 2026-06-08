"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveGymSession } from "@/app/(dashboard)/health/actions";
import { getPendingSessions, removePendingSession } from "./mutation-queue";

/**
 * Despacha treinos que foram concluídos offline (fila em `mutation-queue`). Roda na
 * montagem e sempre que a conexão volta (`online`). Falha de rede → para e tenta de
 * novo depois (mantém a ordem); sucesso → remove da fila e atualiza a lista.
 * Renderizar em telas pós-treino (ex.: página de Treino). Não pinta nada na UI.
 */
export function PendingSessionsSync() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let running = false;

    const flush = async () => {
      if (running) return;
      running = true;
      try {
        const items = getPendingSessions();
        let synced = 0;
        for (const item of items) {
          try {
            const res = await saveGymSession(item.input);
            if (res?.success) {
              removePendingSession(item.id);
              synced += 1;
            } else {
              // Falha lógica (não rede): remove para não travar a fila num loop.
              removePendingSession(item.id);
            }
          } catch {
            // Ainda offline / servidor inacessível — para e tenta no próximo 'online'.
            break;
          }
        }
        if (!cancelled && synced > 0) {
          toast.success(`${synced} treino${synced > 1 ? "s" : ""} sincronizado${synced > 1 ? "s" : ""}.`);
          router.refresh();
        }
      } finally {
        running = false;
      }
    };

    void flush();
    window.addEventListener("online", flush);
    return () => {
      cancelled = true;
      window.removeEventListener("online", flush);
    };
  }, [router]);

  return null;
}
