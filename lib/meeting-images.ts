// Helpers para a galeria de anexos de reunião. As imagens ficam como data URLs
// (Base64) num JSON dentro de `Meeting.images`, mantendo o app portátil — sem
// depender de buckets externos. `image` (single, legado) é o fallback.

import { splitDataUrl, imageRefHelpers } from "./image-store";

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

// Prefixo da rota que serve o base64 externalizado (tabela MeetingImage).
export const MEETING_IMAGE_ROUTE = "/api/meeting-image/";

const meetingRefs = imageRefHelpers(MEETING_IMAGE_ROUTE);
/** Monta a URL servida a partir do id da linha MeetingImage. */
export const meetingImageRef = meetingRefs.ref;
/** Se o `src` for uma referência à rota, devolve o id da linha; senão null. */
export const meetingImageIdFromRef = meetingRefs.idFromRef;
/** Separa um data URL base64 em { mime, data } (compartilhado). */
export const splitMeetingDataUrl = splitDataUrl;

export function serializeMeetingImages(images: MeetingImage[]): string {
  const clean = images
    .filter((img) => img && typeof img.src === "string" && img.src.length > 0)
    .slice(0, MAX_IMAGES)
    .map((img) => (img.caption?.trim() ? { src: img.src, caption: img.caption.trim() } : { src: img.src }));
  return JSON.stringify(clean);
}
