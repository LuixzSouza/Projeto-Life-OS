// Cifragem client-side (Web Crypto / AES-GCM) para LINKS de compartilhamento de
// credenciais. Tudo o que decifra (chave + IV + texto cifrado) vai no FRAGMENTO da
// URL (depois do "#"), que os navegadores NÃO enviam ao servidor — então o segredo
// nunca chega a um log/servidor, nem desta instância nem da do amigo.
//
// Modelo "o link é o segredo": quem tiver o link COMPLETO consegue decifrar. Logo,
// envie por um canal de confiança. (v1 sem expiração/uso único — isso exigiria um
// backend para guardar estado; ficará para a camada social "Círculo".)

const b64url = {
  encode(buf: ArrayBuffer | Uint8Array): string {
    const arr = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let bin = "";
    for (const byte of arr) bin += String.fromCharCode(byte);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(str: string): ArrayBuffer {
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  },
};

export interface SharedCredential {
  title: string;
  username?: string | null;
  password: string;
  url?: string | null;
  notes?: string | null;
  /** Quem enviou (só para exibir "enviado por" — não é autenticado). */
  from?: string | null;
}

/** Cifra a credencial e devolve um token "chave.iv.ciphertext" (base64url) para o
 *  fragmento da URL. Cada chamada gera uma chave nova. */
export async function encryptCredential(data: SharedCredential): Promise<string> {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  const rawKey = await crypto.subtle.exportKey("raw", key);
  return [b64url.encode(rawKey), b64url.encode(iv), b64url.encode(cipher)].join(".");
}

/** Decifra o token vindo do fragmento. Lança se o link for inválido/corrompido. */
export async function decryptCredential(token: string): Promise<SharedCredential> {
  const [k, i, c] = token.split(".");
  if (!k || !i || !c) throw new Error("Link inválido ou incompleto.");
  const key = await crypto.subtle.importKey("raw", b64url.decode(k), { name: "AES-GCM" }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64url.decode(i) }, key, b64url.decode(c));
  return JSON.parse(new TextDecoder().decode(plain)) as SharedCredential;
}
