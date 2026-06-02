// Política de senha compartilhada entre cliente (UX) e servidor (enforcement).
// Mantida pura (sem imports server-only) para poder ser importada em ambos os lados.

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordCheck {
  valid: boolean;
  /** Mensagem de erro em pt-BR, ou null se a senha for válida. */
  message: string | null;
}

/**
 * Regras: mínimo de 8 caracteres, contendo ao menos uma letra E um número.
 */
export function validatePasswordStrength(password: string): PasswordCheck {
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`,
    };
  }

  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: "A senha deve conter pelo menos uma letra." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "A senha deve conter pelo menos um número." };
  }

  return { valid: true, message: null };
}
