"use client";

// Poller global de lembretes de blocos (Fase 1). Montado uma vez no layout do
// dashboard: enquanto o app está aberto, consulta a cada minuto os blocos prestes
// a começar (respeitando o "Alerta" do bloco) e dispara um toast + notificação do
// navegador. Dedup por dia no localStorage para não repetir o mesmo bloco. Usa só
// refs (nenhum setState) — não renderiza nada e não causa re-render.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { pollBlockReminders } from "@/app/(dashboard)/agenda/reminder-actions";

const ALERT_KEY = "lifeos:agenda:block-alerts";
const POLL_MS = 60_000;

interface AlertStore {
  date: string; // yyyy-mm-dd (reseta a cada dia)
  ids: string[];
}

function loadAlerted(): AlertStore {
  if (typeof window === "undefined") return { date: "", ids: [] };
  try {
    const raw = window.localStorage.getItem(ALERT_KEY);
    if (raw) return JSON.parse(raw) as AlertStore;
  } catch {
    /* ignora */
  }
  return { date: "", ids: [] };
}

function saveAlerted(store: AlertStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ALERT_KEY, JSON.stringify(store));
  } catch {
    /* ignora */
  }
}

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function BlockReminders() {
  const router = useRouter();
  const alertedRef = useRef<Set<string>>(new Set());
  const dayRef = useRef<string>("");

  useEffect(() => {
    // Pede permissão de notificação do navegador uma vez (degrada para só-toast).
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }

    // #11: registra o service worker (public/sw.js). Necessário p/ notificação
    // no PWA instalado (Android) e p/ o clique focar/abrir a Agenda.
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Hidrata os já-avisados de hoje (evita repetir após refresh/navegação).
    const stored = loadAlerted();
    const tk = todayKey();
    if (stored.date === tk) {
      dayRef.current = tk;
      alertedRef.current = new Set(stored.ids);
    }

    let active = true;

    const poll = async () => {
      let blocks: Awaited<ReturnType<typeof pollBlockReminders>>;
      try {
        blocks = await pollBlockReminders();
      } catch {
        return;
      }
      if (!active) return;

      // Virada de dia → zera os avisos.
      const tkNow = todayKey();
      if (dayRef.current !== tkNow) {
        dayRef.current = tkNow;
        alertedRef.current = new Set();
      }

      let changed = false;
      for (const b of blocks) {
        if (alertedRef.current.has(b.id)) continue;
        alertedRef.current.add(b.id);
        changed = true;

        const when = b.minutesUntil <= 1 ? "agora" : `em ~${b.minutesUntil} min`;
        const desc = [`Começa ${when}`, b.location].filter(Boolean).join(" · ");

        toast(`⏰ ${b.title}`, {
          description: desc,
          action: { label: "Abrir", onClick: () => router.push("/agenda") },
        });

        if ("Notification" in window && Notification.permission === "granted") {
          const title = `Começa ${when}: ${b.title}`;
          const options: NotificationOptions = {
            body: b.location ?? undefined,
            icon: "/icon-192.png",
            tag: `lifeos-block-${b.id}`, // dedup nativa por bloco
            data: { url: "/agenda?tab=blocks" },
          };
          // Preferência: via service worker (#11) — persiste melhor, funciona no
          // PWA Android e o clique abre a Agenda. Fallback: Notification direto.
          try {
            const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
            if (reg) {
              await reg.showNotification(title, options);
            } else {
              new Notification(title, options);
            }
          } catch {
            /* sem suporte — o toast acima já cobriu */
          }
        }
      }

      if (changed) saveAlerted({ date: dayRef.current || tkNow, ids: [...alertedRef.current] });
    };

    void poll(); // checa já na montagem
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => { active = false; window.clearInterval(id); };
  }, [router]);

  return null;
}
