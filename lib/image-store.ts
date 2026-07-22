// Helpers compartilhados para externalizar imagens base64 em tabelas dedicadas
// servidas por rota /api/<algo>-image/[id]. Mantêm as linhas "quentes" enxutas e o
// app portátil (base64, sem buckets externos). Usado por Meeting e Wardrobe.

/** Separa um data URL base64 em { mime, data }. Retorna null se não for base64. */
export function splitDataUrl(src: string): { mime: string; data: string } | null {
  if (!src.startsWith("data:")) return null;
  const comma = src.indexOf(",");
  if (comma === -1) return null;
  const header = src.slice(5, comma); // ex.: "image/webp;base64"
  if (!/;base64$/i.test(header)) return null;
  const mime = header.replace(/;base64$/i, "") || "application/octet-stream";
  const data = src.slice(comma + 1);
  return data ? { mime, data } : null;
}

/** Fábrica de referência para uma rota de imagem: id ↔ `${routePrefix}${id}`. */
export function imageRefHelpers(routePrefix: string) {
  return {
    /** Monta a URL servida a partir do id da linha. */
    ref(id: string): string {
      return `${routePrefix}${id}`;
    },
    /** Se `src` for uma referência à rota, devolve o id da linha; senão null. */
    idFromRef(src: string): string | null {
      if (!src.startsWith(routePrefix)) return null;
      const id = src.slice(routePrefix.length).split(/[?#]/)[0];
      return id || null;
    },
  };
}
