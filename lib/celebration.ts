// Página de Aniversário ("Celebrar") — núcleo server-only.
//
// Gera uma homenagem bonita e DINÂMICA por pessoa, com link compartilhável
// (rota pública /celebrar/<token>) e versão interna (/social/celebrar/<id>).
// O link é autenticado por token assinado (HMAC sobre userId+friendId+tokenVersion
// com o JWT_SECRET) — mesma postura do feed iCal: sem cookie, sem dado novo no
// banco, e "Desconectar outros dispositivos" (gira o tokenVersion) revoga os
// links de graça. O tema visual sai de um hash do amigo: estável entre recargas,
// mas diferente para cada pessoa (nunca parece repetitivo).

import { createHmac, timingSafeEqual } from "crypto";

const SIG_LENGTH = 32; // hex chars (128 bits do HMAC-SHA256 — suficiente p/ URL)

function sign(userId: string, friendId: string, tokenVersion: number): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret)
    .update(`celebrate:v1:${userId}:${friendId}:${tokenVersion}`)
    .digest("hex")
    .slice(0, SIG_LENGTH);
}

/** Token da URL pública: `<userId>.<friendId>.<assinatura>`. */
export function makeCelebrationToken(userId: string, friendId: string, tokenVersion: number): string | null {
  const sig = sign(userId, friendId, tokenVersion);
  return sig ? `${userId}.${friendId}.${sig}` : null;
}

export function parseCelebrationToken(raw: string): { userId: string; friendId: string; sig: string } | null {
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [userId, friendId, sig] = parts;
  if (!userId || !friendId || sig.length !== SIG_LENGTH) return null;
  return { userId, friendId, sig };
}

export function verifyCelebrationSignature(
  userId: string,
  friendId: string,
  tokenVersion: number,
  sig: string,
): boolean {
  const expected = sign(userId, friendId, tokenVersion);
  if (!expected) return false;
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tema visual — determinístico por pessoa
// ---------------------------------------------------------------------------

export interface CelebrationTheme {
  key: string;
  /** Saudação grande no topo (varia para não repetir entre pessoas). */
  greeting: string;
  /** Classes Tailwind do gradiente de fundo (claro/escuro já embutidos). */
  background: string;
  /** Cor de destaque do nome (texto). */
  accentText: string;
  /** Halo/sombra colorida atrás da foto. */
  glow: string;
  /** Paleta dos confetes (hex). */
  confetti: string[];
  /** Emojis que flutuam ao fundo. */
  floaters: string[];
}

const THEMES: CelebrationTheme[] = [
  {
    key: "sunset",
    greeting: "Feliz Aniversário",
    background: "bg-gradient-to-br from-rose-100 via-orange-50 to-amber-100 dark:from-rose-950 dark:via-zinc-950 dark:to-amber-950",
    accentText: "text-rose-500 dark:text-rose-400",
    glow: "shadow-[0_0_120px_-10px_rgba(244,63,94,0.55)]",
    confetti: ["#f43f5e", "#fb923c", "#fbbf24", "#fda4af", "#fdba74"],
    floaters: ["🎉", "🎂", "🥳", "✨", "🌅"],
  },
  {
    key: "ocean",
    greeting: "Hoje é o seu dia",
    background: "bg-gradient-to-br from-sky-100 via-cyan-50 to-indigo-100 dark:from-sky-950 dark:via-zinc-950 dark:to-indigo-950",
    accentText: "text-sky-500 dark:text-sky-400",
    glow: "shadow-[0_0_120px_-10px_rgba(14,165,233,0.55)]",
    confetti: ["#0ea5e9", "#22d3ee", "#6366f1", "#7dd3fc", "#a5b4fc"],
    floaters: ["🎈", "🎊", "💙", "✨", "🐬"],
  },
  {
    key: "candy",
    greeting: "Parabéns",
    background: "bg-gradient-to-br from-fuchsia-100 via-pink-50 to-violet-100 dark:from-fuchsia-950 dark:via-zinc-950 dark:to-violet-950",
    accentText: "text-fuchsia-500 dark:text-fuchsia-400",
    glow: "shadow-[0_0_120px_-10px_rgba(217,70,239,0.55)]",
    confetti: ["#d946ef", "#ec4899", "#a855f7", "#f0abfc", "#d8b4fe"],
    floaters: ["🎀", "🧁", "💖", "✨", "🎉"],
  },
  {
    key: "forest",
    greeting: "Que dia especial",
    background: "bg-gradient-to-br from-emerald-100 via-lime-50 to-teal-100 dark:from-emerald-950 dark:via-zinc-950 dark:to-teal-950",
    accentText: "text-emerald-500 dark:text-emerald-400",
    glow: "shadow-[0_0_120px_-10px_rgba(16,185,129,0.55)]",
    confetti: ["#10b981", "#84cc16", "#14b8a6", "#6ee7b7", "#bef264"],
    floaters: ["🌿", "🎉", "🍀", "✨", "🥳"],
  },
  {
    key: "gold",
    greeting: "Um brinde a você",
    background: "bg-gradient-to-br from-amber-100 via-yellow-50 to-orange-100 dark:from-amber-950 dark:via-zinc-950 dark:to-orange-950",
    accentText: "text-amber-500 dark:text-amber-400",
    glow: "shadow-[0_0_120px_-10px_rgba(245,158,11,0.6)]",
    confetti: ["#f59e0b", "#eab308", "#fb923c", "#fcd34d", "#fde68a"],
    floaters: ["🥂", "🎉", "🌟", "✨", "🎂"],
  },
  {
    key: "galaxy",
    greeting: "Feliz Aniversário",
    background: "bg-gradient-to-br from-indigo-100 via-violet-50 to-purple-100 dark:from-indigo-950 dark:via-zinc-950 dark:to-purple-950",
    accentText: "text-indigo-500 dark:text-indigo-400",
    glow: "shadow-[0_0_120px_-10px_rgba(99,102,241,0.55)]",
    confetti: ["#6366f1", "#8b5cf6", "#a855f7", "#c4b5fd", "#818cf8"],
    floaters: ["🌌", "✨", "🪐", "💫", "🎉"],
  },
];

/** Hash estável (FNV-1a) de uma string → inteiro não-negativo. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Tema determinístico a partir de uma semente (ex.: id do amigo). */
export function pickTheme(seed: string): CelebrationTheme {
  return THEMES[hashString(seed) % THEMES.length];
}

// ---------------------------------------------------------------------------
// Idade / aniversário
// ---------------------------------------------------------------------------

/** Idade que a pessoa faz no aniversário deste ano (null se sem data). */
export function turningAge(birthday: Date | null): number | null {
  if (!birthday) return null;
  const age = new Date().getFullYear() - birthday.getUTCFullYear();
  return age > 0 && age < 130 ? age : null;
}

/** É hoje o aniversário? (compara dia/mês em UTC, ignorando o ano). */
export function isBirthdayToday(birthday: Date | null): boolean {
  if (!birthday) return false;
  const now = new Date();
  return birthday.getUTCDate() === now.getDate() && birthday.getUTCMonth() === now.getMonth();
}

// ---------------------------------------------------------------------------
// Mensagem — fallback local (sem IA), variada por pessoa
// ---------------------------------------------------------------------------

export interface FriendForMessage {
  id: string;
  name: string;
  nickname: string | null;
  proximity: string;
  notes: string | null;
  tags: string | null;
  birthday: Date | null;
}

function proximityWord(proximity: string): string {
  switch (proximity) {
    case "FAMILY": return "da família";
    case "CLOSE": return "tão próximo";
    case "WORK": return "de trabalho";
    default: return "especial";
  }
}

/** Primeiro nome ou apelido para tratamento caloroso. */
export function displayNameOf(friend: { name: string; nickname: string | null }): string {
  if (friend.nickname && friend.nickname.trim()) return friend.nickname.trim();
  return (friend.name || "").trim().split(/\s+/)[0] || friend.name;
}

/**
 * Homenagem determinística (sem IA): escolhe um conjunto de parágrafos por hash
 * do amigo, então cada pessoa recebe um texto diferente e estável.
 */
export function localCelebrationMessage(friend: FriendForMessage): string[] {
  const nome = displayNameOf(friend);
  const age = turningAge(friend.birthday);
  const ageLine = age ? `${age} voltas ao redor do sol` : "mais um ano de história";

  const openings = [
    `${nome}, hoje o mundo ficou um pouquinho melhor só por ser o seu dia. 🎉`,
    `Feliz aniversário, ${nome}! Que esse novo ciclo venha leve, cheio e do seu jeito. 🎂`,
    `${nome}, parabéns! Hoje é dia de celebrar exatamente quem você é. ✨`,
    `Que data linda, ${nome}. Que ela seja só o começo de um ano memorável. 🥳`,
  ];
  const middles = [
    `São ${ageLine} — e cada uma delas deixou você mais inteiro, mais sábio e mais você.`,
    `Que neste ano não falte saúde, riso solto, abraço apertado e aquelas pequenas alegrias do dia a dia.`,
    `Que você continue espalhando essa energia ${proximityWord(friend.proximity)} por onde passa.`,
    `Que os próximos meses tragam conquistas, descanso na medida certa e gente boa por perto.`,
  ];
  const closings = [
    `Conta comigo sempre. Hoje a gente comemora você! 🎈`,
    `Que venham muitos outros — e que eu esteja por perto pra ver. 💛`,
    `Aproveite cada minuto de hoje. Você merece o mundo. 🌟`,
    `Um brinde a você e a tudo que ainda está por vir! 🥂`,
  ];

  const h = hashString(friend.id);
  return [
    openings[h % openings.length],
    middles[(h >> 3) % middles.length],
    closings[(h >> 6) % closings.length],
  ];
}

/** Prompt para a IA escrever uma homenagem única e calorosa (PT-BR). */
export function celebrationAiPrompt(friend: FriendForMessage): { system: string; user: string } {
  const age = turningAge(friend.birthday);
  const system =
    "Você escreve uma homenagem de aniversário em PT-BR, calorosa, pessoal e sincera, " +
    "falando DIRETAMENTE com a pessoa aniversariante (use 'você'). " +
    "Escreva EXATAMENTE 3 parágrafos curtos, separados por uma linha em branco. " +
    "Pode usar no máximo 2 ou 3 emojis no total, com bom gosto. " +
    "Seja específico e afetuoso, NUNCA genérico ou corporativo. Não use o sobrenome, " +
    "não invente fatos que não foram fornecidos, não comece com 'Prezado' nem assine no final.";

  const parts: string[] = [];
  parts.push(`Nome de tratamento: ${displayNameOf(friend)}`);
  parts.push(`Tipo de relação: ${proximityWord(friend.proximity)}`);
  if (age) parts.push(`Idade que está completando: ${age} anos`);
  if (friend.tags) parts.push(`Características/tags: ${friend.tags}`);
  if (friend.notes) parts.push(`Notas pessoais sobre ela: ${friend.notes}`);
  parts.push("Escreva a homenagem agora.");

  return { system, user: parts.join("\n") };
}

/** Divide o texto da IA em parágrafos limpos. */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
