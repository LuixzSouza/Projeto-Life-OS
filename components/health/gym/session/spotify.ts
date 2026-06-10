"use client";

// Controle do Spotify durante o treino — OAuth PKCE 100% no cliente (sem backend,
// sem client secret), no espírito local-first do app. Requer só o Client ID de um
// app criado em developer.spotify.com (env NEXT_PUBLIC_SPOTIFY_CLIENT_ID) com o
// Redirect URI "<origem>/health/gym/session" cadastrado.
//
// O que dá pra fazer via Web API: ler a faixa TOCANDO EM QUALQUER APARELHO
// (celular, desktop) e mandar play/pause/pular/voltar (controle exige Premium —
// a leitura funciona para todo mundo). O token fica no localStorage com refresh
// automático; tudo best-effort.

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
const TOKEN_KEY = "lifeos:gym:spotify-token";
const VERIFIER_KEY = "lifeos:gym:spotify-verifier";
const SCOPES = "user-read-playback-state user-modify-playback-state";
const STATE = "lifeos-gym";

interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

export interface NowPlaying {
  track: string;
  artist: string;
  isPlaying: boolean;
}

export function isSpotifyConfigured(): boolean {
  return !!CLIENT_ID;
}

function readToken(): TokenSet | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as TokenSet) : null;
  } catch {
    return null;
  }
}

function writeToken(t: TokenSet | null): void {
  try {
    if (t) window.localStorage.setItem(TOKEN_KEY, JSON.stringify(t));
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignora */
  }
}

export function isSpotifyConnected(): boolean {
  return !!readToken();
}

export function disconnectSpotify(): void {
  writeToken(null);
}

function redirectUri(): string {
  return `${window.location.origin}/health/gym/session`;
}

// ---- PKCE helpers ----
function randomString(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => chars[b % chars.length]).join("");
}

async function challengeFrom(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Redireciona para o consentimento do Spotify (volta para a tela da sessão). */
export async function beginSpotifyAuth(): Promise<void> {
  if (!CLIENT_ID) return;
  const verifier = randomString(64);
  try {
    window.localStorage.setItem(VERIFIER_KEY, verifier);
  } catch {
    return;
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state: STATE,
    code_challenge_method: "S256",
    code_challenge: await challengeFrom(verifier),
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

async function tokenRequest(body: URLSearchParams): Promise<TokenSet | null> {
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
    if (!json.access_token) return null;
    const prev = readToken();
    return {
      accessToken: json.access_token,
      refreshToken: json.refresh_token ?? prev?.refreshToken,
      expiresAt: Date.now() + ((json.expires_in ?? 3600) - 60) * 1000,
    };
  } catch {
    return null;
  }
}

/** Se a URL atual é o retorno do consentimento (?code&state), troca por token.
 *  Retorna true se conectou (o chamador limpa a URL). */
export async function handleSpotifyCallback(): Promise<boolean> {
  if (!CLIENT_ID || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  if (!code || params.get("state") !== STATE) return false;
  const verifier = window.localStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false;
  const token = await tokenRequest(new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: CLIENT_ID,
    code_verifier: verifier,
  }));
  try {
    window.localStorage.removeItem(VERIFIER_KEY);
  } catch {
    /* ignora */
  }
  if (!token) return false;
  writeToken(token);
  return true;
}

async function freshAccessToken(): Promise<string | null> {
  const t = readToken();
  if (!t) return null;
  if (Date.now() < t.expiresAt) return t.accessToken;
  if (!t.refreshToken || !CLIENT_ID) {
    writeToken(null);
    return null;
  }
  const renewed = await tokenRequest(new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: t.refreshToken,
    client_id: CLIENT_ID,
  }));
  writeToken(renewed); // null = refresh falhou → desconecta
  return renewed?.accessToken ?? null;
}

/** Faixa tocando agora em QUALQUER aparelho conectado à conta. Null = nada/erro. */
export async function getNowPlaying(): Promise<NowPlaying | null> {
  const token = await freshAccessToken();
  if (!token) return null;
  try {
    const res = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || !res.ok) return null;
    const json = (await res.json()) as {
      is_playing?: boolean;
      item?: { name?: string; artists?: { name: string }[] } | null;
    };
    if (!json.item?.name) return null;
    return {
      track: json.item.name,
      artist: (json.item.artists ?? []).map((a) => a.name).join(", "),
      isPlaying: !!json.is_playing,
    };
  } catch {
    return null;
  }
}

export type SpotifyAction = "play" | "pause" | "next" | "previous";

/** Manda um comando pro aparelho ativo. Lança mensagem amigável em erro conhecido. */
export async function spotifyControl(action: SpotifyAction): Promise<void> {
  const token = await freshAccessToken();
  if (!token) throw new Error("Spotify desconectado — conecte de novo.");
  const cfg: Record<SpotifyAction, { method: string; path: string }> = {
    play: { method: "PUT", path: "play" },
    pause: { method: "PUT", path: "pause" },
    next: { method: "POST", path: "next" },
    previous: { method: "POST", path: "previous" },
  };
  const { method, path } = cfg[action];
  const res = await fetch(`https://api.spotify.com/v1/me/player/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 403) throw new Error("Controlar o player exige Spotify Premium.");
  if (res.status === 404) throw new Error("Nenhum aparelho tocando — dê o play no app do Spotify primeiro.");
  if (!res.ok && res.status !== 204) throw new Error("O Spotify não aceitou o comando.");
}
