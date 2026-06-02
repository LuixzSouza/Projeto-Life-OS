// Helpers puros (não-server) compartilhados pelas server actions de settings.

// Formata bytes para legibilidade (ex: 2.5 MB)
export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Gera URL amigável (Slug) para projetos antigos que não tinham
export function generateSlug(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "") // Remove acentos
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^\w-]+/g, "")
        .replace(/--+/g, "-") || `item-${Date.now()}`;
}
