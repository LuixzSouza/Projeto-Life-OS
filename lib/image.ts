// Utilitário de compressão/redimensionamento de imagens no cliente.
// Mantém os uploads (avatar, capa) pequenos para caber no limite das Server
// Actions e preservar a portabilidade do banco SQLite (imagens em base64).

export interface CompressOptions {
  /** Maior dimensão (largura ou altura) permitida em pixels. */
  maxDimension?: number;
  /** Qualidade de 0 a 1 (para formatos com perda). */
  quality?: number;
  /** MIME de saída preferido. Faz fallback para JPEG se não suportado. */
  mimeType?: string;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
    img.src = src;
  });
}

/**
 * Lê um arquivo de imagem, redimensiona mantendo a proporção e retorna
 * um data URL (base64) comprimido. Em caso de falha, retorna o original.
 */
export async function compressImageFile(file: File, opts: CompressOptions = {}): Promise<string> {
  const { maxDimension = 1024, quality = 0.85, mimeType = "image/webp" } = opts;

  const originalDataUrl = await readFileAsDataURL(file);

  // SVG não deve ser rasterizado; retorna como está.
  if (file.type === "image/svg+xml") return originalDataUrl;

  const img = await loadImage(originalDataUrl);

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    const scale = Math.min(maxDimension / width, maxDimension / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return originalDataUrl;

  ctx.drawImage(img, 0, 0, width, height);

  // Tenta o formato preferido (WebP) e cai para JPEG se não for suportado.
  let out = canvas.toDataURL(mimeType, quality);
  if (!out.startsWith(`data:${mimeType}`)) {
    out = canvas.toDataURL("image/jpeg", quality);
  }

  // Segurança: se por algum motivo a versão comprimida ficar maior que a
  // original (imagens já minúsculas), mantém a original.
  return out.length < originalDataUrl.length ? out : originalDataUrl;
}
