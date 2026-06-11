// Rate-limit simples em memória (proteção de força bruta no login).
// Conta apenas TENTATIVAS FALHAS por chave (email+IP) numa janela deslizante.
// Em serverless a memória zera no cold start — ainda assim corta ataques
// contínuos; no desktop (processo longo) funciona integralmente.

const failures = new Map<string, number[]>();

const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutos

function prune(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length === 0) failures.delete(key);
  else failures.set(key, list);
  return list;
}

/** O login desta chave está bloqueado? Retorna minutos restantes quando sim. */
export function isLoginBlocked(key: string): { blocked: boolean; retryMinutes: number } {
  const now = Date.now();
  const list = prune(key, now);
  if (list.length < MAX_FAILURES) return { blocked: false, retryMinutes: 0 };
  const oldest = list[0];
  const retryMinutes = Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 60000));
  return { blocked: true, retryMinutes };
}

/** Registra uma tentativa de login FALHA. */
export function registerLoginFailure(key: string): void {
  const now = Date.now();
  const list = prune(key, now);
  list.push(now);
  failures.set(key, list);
}

/** Login bem-sucedido limpa o histórico de falhas da chave. */
export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
