// src/lib/crypto.ts
import crypto from 'crypto';
import { getOrCreateSecret } from './db-config';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Default histórico. Antes era usada para CIFRAR quando não havia ENCRYPTION_KEY
 * — o que é inseguro em deploy público (a chave está versionada no repositório).
 * Agora ela vive APENAS como chave legada de leitura, para decifrar dados que
 * eventualmente foram gravados com ela. NUNCA é usada para cifrar dados novos.
 */
const LEGACY_DEFAULT = 'minha-chave-secreta-super-segura-32';
const LEGACY_KEYS = [LEGACY_DEFAULT];

/**
 * Chave primária (cifra TODOS os dados novos), resolvida de forma preguiçosa:
 *   1. `process.env.ENCRYPTION_KEY` quando definida (obrigatória em produção/Vercel);
 *   2. desktop/local sem .env → segredo forte auto-gerado e persistido no config;
 *   3. serverless (Vercel) sem a env → `getOrCreateSecret` lança erro claro,
 *      evitando cifrar o cofre com uma chave volátil/pública.
 * Memoizada para não reprocessar a cada operação.
 */
let cachedPrimaryKey: string | null = null;
function getPrimaryKey(): string {
  if (cachedPrimaryKey) return cachedPrimaryKey;
  cachedPrimaryKey = process.env.ENCRYPTION_KEY?.trim() || getOrCreateSecret('ENCRYPTION_KEY');
  return cachedPrimaryKey;
}

// AES-256 exige chave de exatamente 32 bytes. Normaliza qualquer segredo:
// trunca se for maior, completa com zeros se for menor (evita "Invalid key length").
function normalizeKey(secret: string): string {
  return secret.slice(0, 32).padEnd(32, '0');
}

// Lista de chaves candidatas (primária à frente), sem duplicatas.
function candidateKeys(): Buffer[] {
  const seen = new Set<string>();
  const keys: Buffer[] = [];
  for (const secret of [getPrimaryKey(), ...LEGACY_KEYS]) {
    const norm = normalizeKey(secret);
    if (seen.has(norm)) continue;
    seen.add(norm);
    keys.push(Buffer.from(norm));
  }
  return keys;
}

// Formato de saída do encrypt: "<iv hex de 32 chars>:<cipher hex>".
const ENCRYPTED_RE = /^[0-9a-f]{32}:[0-9a-f]+$/i;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(normalizeKey(getPrimaryKey())), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  // Dado legado em texto puro (não está no formato iv:cipher): devolve como está.
  if (!ENCRYPTED_RE.test(text)) return text;

  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');

  // Tenta cada chave candidata (atual + legadas) até uma decifrar com sucesso.
  for (const key of candidateKeys()) {
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      // Chave errada para este dado — tenta a próxima.
    }
  }

  // Nenhuma chave conhecida decifrou: o segredo usado na cifragem foi perdido.
  // Lançamos erro em vez de devolver o blob cifrado (que confundiria o usuário).
  throw new Error('DECRYPT_FAILED');
}

/**
 * Indica se um valor já está cifrado no formato atual. Útil para migrações
 * (ex.: re-criptografar dados legados sem cifrar duas vezes).
 */
export function isEncrypted(value: string): boolean {
  return ENCRYPTED_RE.test(value);
}
