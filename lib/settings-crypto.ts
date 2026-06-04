// Criptografia at-rest das credenciais guardadas em Settings.
// ----------------------------------------------------------------------------
// As chaves de API/serviço são gravadas cifradas (AES-256-CBC via lib/crypto)
// e descriptografadas no ponto de consumo. `decrypt()` é tolerante: se o valor
// não estiver no formato cifrado (ex.: chave salva antes desta feature), ele
// retorna o texto original — então a migração é transparente, sem script.
import { encrypt, decrypt } from "./crypto";

// Colunas sensíveis do modelo Settings que devem ser cifradas.
export const SETTINGS_SECRET_FIELDS = [
  "openaiKey",
  "groqKey",
  "googleKey",
  "deepseekKey",
  "mistralKey",
  "tmdbApiKey",
  "rawgApiKey",
  "googleBooksApiKey",
  "pluggyClientId",
  "pluggySecret",
  "brapiToken",
] as const;

// Cifra um valor para gravação. `null`/vazio passam direto como `null`
// (permite limpar a chave).
export function encryptKey(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return encrypt(trimmed);
}

// Decifra um único valor. `null`/vazio retornam `null`.
export function decryptKey(value: string | null | undefined): string | null {
  if (!value) return null;
  return decrypt(value);
}

// Retorna uma cópia do objeto Settings com TODAS as colunas sensíveis
// descriptografadas, preservando os demais campos e o tipo original.
export function decryptSettings<T extends Record<string, unknown>>(settings: T | null): T | null {
  if (!settings) return settings;
  const clone: Record<string, unknown> = { ...settings };
  for (const field of SETTINGS_SECRET_FIELDS) {
    const value = clone[field];
    if (typeof value === "string" && value) {
      clone[field] = decrypt(value);
    }
  }
  return clone as T;
}
