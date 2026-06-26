// Cópia resiliente para a área de transferência. Fonte ÚNICA usada tanto no app
// quanto na página pública de credencial compartilhada — que abre muito em
// navegadores embutidos (WhatsApp/Instagram), onde navigator.clipboard costuma
// falhar ou nem existir. Por isso caímos para textarea + execCommand antes de
// desistir, e devolvemos um booleano honesto (nada de "copiado" falso).
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* contexto inseguro / webview restrito: tenta o fallback abaixo */
  }
  try {
    if (typeof document === "undefined") return false;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Senha copiada sai do clipboard depois disso (padrão de gerenciadores de senha). */
export const CLIPBOARD_CLEAR_TTL_MS = 35_000;

/**
 * Agenda a limpeza do clipboard após o TTL — só se ele AINDA contiver o segredo
 * copiado (não atropela algo que o usuário copiou depois). Sem permissão de
 * leitura não dá para conferir: aí não mexe (melhor que apagar conteúdo alheio).
 */
export function scheduleClipboardClear(secret: string, ttlMs = CLIPBOARD_CLEAR_TTL_MS): void {
  setTimeout(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return;
      const current = await navigator.clipboard.readText();
      if (current === secret) await navigator.clipboard.writeText("");
    } catch {
      // Leitura negada/aba sem foco: não arrisca sobrescrever o clipboard.
    }
  }, ttlMs);
}
