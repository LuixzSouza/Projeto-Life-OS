/**
 * Garante que um link colado pelo usuário abra DE FATO no navegador. Sem esquema
 * (ex.: "www.site.com" ou "site.com/pagina"), um href é tratado como caminho
 * relativo e "Abrir" não vai a lugar nenhum — então prefixamos https://.
 * Preserva esquemas já válidos (http, https, //, mailto, tel, data).
 */
export function externalHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url)) return url; // http://, https://, //host
  if (/^(mailto:|tel:|data:)/i.test(url)) return url;
  return `https://${url}`;
}
