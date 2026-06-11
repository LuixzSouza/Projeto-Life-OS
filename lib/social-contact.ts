// "Manter contato" do CRM social — SEM coluna nova: cada "falei com fulano" vira
// um ActivityLog (action CONTACT, module social), que já aparece na Linha do
// Tempo de graça. O último registro por amigo é o "último contato". A faxina do
// Otimizador de Espaço preserva esses logs (são dado, não auditoria).
// Isomórfico: usado por server actions, página, lembretes e componentes client.

export const CONTACT_ACTION = "CONTACT";
export const CONTACT_MODULE = "social";

/**
 * Cadência desejada de contato (em dias) por nível de proximidade.
 * Passou disso desde o último registro → hora de reconectar.
 */
export function reconnectAfterDays(proximity: string | null | undefined): number {
  switch (proximity) {
    case "FAMILY":
    case "CLOSE":
      return 30;
    case "WORK":
      return 60;
    default:
      return 90; // CASUAL
  }
}

/** Dias corridos desde a data (0 = hoje). Null se a data for inválida/ausente. */
export function daysSinceContact(iso: string | Date | null | undefined): number | null {
  if (!iso) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 864e5));
}

/** Está vencido? Só considera quem TEM registro (a feature é opt-in pelo uso). */
export function isReconnectDue(lastContactIso: string | Date | null | undefined, proximity: string | null | undefined): boolean {
  const days = daysSinceContact(lastContactIso);
  if (days === null) return false;
  return days > reconnectAfterDays(proximity);
}
