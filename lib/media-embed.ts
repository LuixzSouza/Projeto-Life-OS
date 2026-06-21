// Detecção de vídeo embutido em texto de cartão (sem coluna nova no banco):
// o usuário cola um link do YouTube/Vimeo/MP4 no verso (ou frente) e a revisão
// renderiza um player. Função PURA — usada na tela de estudo e na listagem.
// Privacy-first: o player do YouTube usa o domínio nocookie e só carrega no
// clique (ver components/flashcards/video-embed.tsx).

export interface VideoEmbed {
  kind: "youtube" | "vimeo" | "file";
  /** URL original encontrada no texto. */
  url: string;
  /** src do iframe (YouTube/Vimeo). */
  embedUrl?: string;
  /** Pôster para o click-to-load (YouTube). */
  thumbnail?: string;
}

const YOUTUBE = /(?:youtube\.com\/(?:watch\?(?:[^\s]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i;
const VIMEO = /vimeo\.com\/(?:video\/)?(\d+)/i;
const VIDEO_FILE = /https?:\/\/[^\s"']+\.(?:mp4|webm|ogg|mov)(?:\?[^\s"']*)?/i;

/** Acha o PRIMEIRO vídeo reconhecível no texto, ou null. */
export function findVideoEmbed(text: string | null | undefined): VideoEmbed | null {
  if (!text) return null;

  const yt = text.match(YOUTUBE);
  if (yt) {
    const id = yt[1];
    return {
      kind: "youtube",
      url: yt[0],
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  const vm = text.match(VIMEO);
  if (vm) {
    return { kind: "vimeo", url: vm[0], embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  }

  const file = text.match(VIDEO_FILE);
  if (file) return { kind: "file", url: file[0] };

  return null;
}
