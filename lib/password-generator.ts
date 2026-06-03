// Gerador de senha forte — puro e client-safe (sem imports server-only).
// Garante compatibilidade com a política em `password-policy.ts`
// (≥8 caracteres, com letra e número) e adiciona símbolos para mais entropia.

const LOWER = "abcdefghijkmnopqrstuvwxyz"; // sem 'l' (confusão visual)
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sem 'I' e 'O'
const DIGITS = "23456789"; // sem '0' e '1'
const SYMBOLS = "!@#$%&*?-_";

/** Índice aleatório criptograficamente seguro (com fallback). */
function randomIndex(max: number): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function pick(chars: string): string {
  return chars[randomIndex(chars.length)];
}

/**
 * Gera uma senha forte de `length` caracteres (padrão 16), garantindo ao menos
 * um de cada categoria e embaralhando o resultado.
 */
export function generateStrongPassword(length = 16): string {
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const all = LOWER + UPPER + DIGITS + SYMBOLS;

  const rest = Array.from({ length: Math.max(length, 8) - required.length }, () =>
    pick(all)
  );

  const chars = [...required, ...rest];

  // Embaralha (Fisher-Yates) para não deixar as categorias obrigatórias no início.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}
