// Helpers para a galeria de anexos de reunião. As imagens ficam como data URLs
// (Base64) num JSON dentro de `Meeting.images`, mantendo o app portátil — sem
// depender de buckets externos. `image` (single, legado) é o fallback.

const MAX_IMAGES = 20;

export interface MeetingImage {
  src: string;
  caption?: string;
}

export function parseMeetingImages(images?: string | null, legacy?: string | null): MeetingImage[] {
  if (images) {
    try {
      const arr = JSON.parse(images);
      if (Array.isArray(arr)) {
        return arr
          .map((item): MeetingImage | null => {
            if (typeof item === "string" && item) return { src: item };
            if (item && typeof item.src === "string" && item.src) {
              return { src: item.src, caption: typeof item.caption === "string" ? item.caption : undefined };
            }
            return null;
          })
          .filter((x): x is MeetingImage => x !== null);
      }
    } catch {
      /* json inválido → cai no legado */
    }
  }
  return legacy ? [{ src: legacy }] : [];
}

export function serializeMeetingImages(images: MeetingImage[]): string {
  const clean = images
    .filter((img) => img && typeof img.src === "string" && img.src.length > 0)
    .slice(0, MAX_IMAGES)
    .map((img) => (img.caption?.trim() ? { src: img.src, caption: img.caption.trim() } : { src: img.src }));
  return JSON.stringify(clean);
}
