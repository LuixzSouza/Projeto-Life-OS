"use client";

// Notificação do treino quando o app sai de cena (aba escondida / celular
// bloqueado): mostra título, tempo e progresso na bandeja para o treino não
// "sumir". Best-effort puro: sem permissão ou sem suporte, não faz nada.

const PREF_KEY = "lifeos:gym:notify";
const TAG = "lifeos-gym-session";

export function isNotifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isNotifyEnabled(): boolean {
  if (!isNotifySupported()) return false;
  try {
    return window.localStorage.getItem(PREF_KEY) === "1" && Notification.permission === "granted";
  } catch {
    return false;
  }
}

/** Liga/desliga (pedindo permissão na primeira vez). Retorna o estado final. */
export async function setNotifyEnabled(enabled: boolean): Promise<boolean> {
  if (!isNotifySupported()) return false;
  try {
    if (!enabled) {
      window.localStorage.setItem(PREF_KEY, "0");
      return false;
    }
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    const ok = perm === "granted";
    window.localStorage.setItem(PREF_KEY, ok ? "1" : "0");
    return ok;
  } catch {
    return false;
  }
}

/** Mostra/atualiza a notificação da sessão (mesma tag = substitui, não acumula).
 *  Com descanso rodando, informa a hora do fim (dá pra acompanhar da bandeja). */
export function showSessionNotification(info: { title: string; elapsed: string; doneSets: number; totalSets: number; restEndsAt?: number }): void {
  if (!isNotifyEnabled()) return;
  try {
    const restLine = info.restEndsAt && info.restEndsAt > Date.now()
      ? ` · descanso até ${new Date(info.restEndsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
      : "";
    const n = new Notification(`🏋️ ${info.title}`, {
      tag: TAG,
      body: `${info.elapsed} · ${info.doneSets}/${info.totalSets} séries${restLine} — toque para voltar ao treino`,
      silent: true,
    });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* ignora */
      }
    };
  } catch {
    /* construtor pode lançar em alguns Androids (exige Service Worker) — ignora */
  }
}

const REST_TAG = "lifeos-gym-rest";

/** Alarme do FIM do descanso com o app em segundo plano. Best-effort: o timer
 *  que dispara isto pode ser estrangulado pelo navegador, mas quando roda, a
 *  notificação NÃO é silenciosa — vibra/soa como alarme do sistema. */
export function showRestEndNotification(nextName?: string): void {
  if (!isNotifyEnabled()) return;
  try {
    const n = new Notification("⏱️ Descanso concluído!", {
      tag: REST_TAG,
      body: nextName ? `Bora! Agora: ${nextName}` : "Bora pra próxima série!",
      silent: false,
    });
    n.onclick = () => {
      try {
        window.focus();
        n.close();
      } catch {
        /* ignora */
      }
    };
  } catch {
    /* alguns Androids exigem Service Worker — ignora */
  }
}

export function closeSessionNotification(): void {
  // Sem registro de SW não há como enumerar notificações; a tag única já evita
  // acúmulo e a notificação some sozinha ao tocar. Nada a fazer aqui.
}
