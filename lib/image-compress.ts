// Comprime/redimensiona uma imagem para um data URL leve (WebP, com fallback),
// mantendo o app portátil (Base64, sem buckets externos). Sem dependências:
// usa só Canvas do navegador. Roda apenas no client.

interface CompressOpts {
  maxDim?: number;   // maior lado em px
  quality?: number;  // 0..1
  type?: string;     // mime de saída
}

export async function compressImage(file: File | Blob, opts: CompressOpts = {}): Promise<string> {
  const { maxDim = 1600, quality = 0.72, type = "image/webp" } = opts;

  const dataUrl = await readAsDataURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return dataUrl; // não decodificou? devolve original (ainda válido)
  }

  const scale = Math.min(1, maxDim / Math.max(img.width, img.height || 1));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);

  // Se o navegador não suportar WebP, toDataURL volta para PNG — segue válido.
  const out = canvas.toDataURL(type, quality);
  // Usa o menor entre comprimido e original.
  return out.length > 0 && out.length < dataUrl.length ? out : dataUrl;
}

function readAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Falha ao decodificar a imagem."));
    i.src = src;
  });
}
