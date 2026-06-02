export const getDomain = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return domain;
  } catch {
    return null;
  }
};

export const calculateStrength = (pass: string | null): number => {
  if (!pass) return 0;
  let score = 0;
  if (pass.length > 8) score += 30;
  if (pass.length > 12) score += 20;
  if (/[A-Z]/.test(pass)) score += 20;
  if (/[0-9]/.test(pass)) score += 15;
  if (/[^A-Za-z0-9]/.test(pass)) score += 15;
  return Math.min(score, 100);
};

// Formata data curta (ex: "5 de abr"). Mantida local pois usa formato distinto
// do helper global (dd/MM/yyyy); locale fixo garante consistência de hidratação.
export const formatShortDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(date));
};
