"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { decryptSettings } from "@/lib/settings-crypto";

// --- TIPAGEM FORTE ---

// 🟢 ADICIONADO: 'BOOK'
export type MediaType = 'MOVIE' | 'TV_SHOW' | 'ALBUM' | 'GAME' | 'BOOK';

export type SearchResult = {
  id: string;
  title: string;
  overview: string | null;
  coverUrl: string | null;
  type: MediaType;
  releaseYear: string | null;
  creator: string | null;
};

// Interfaces para as respostas das APIs
interface ItunesItem {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
  releaseDate?: string;
}

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  overview?: string;
  media_type?: 'movie' | 'tv';
  release_date?: string;
  first_air_date?: string;
  poster_path?: string;
}

interface RawgItem {
  id: number;
  name: string;
  released?: string;
  background_image?: string;
}

// 🟢 ADICIONADO: Interface do Google Books
interface GoogleBooksItem {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
    };
  };
}

// Helper para pegar o ID do usuário autenticado (sessão JWT)
async function getAuthenticatedUserId() {
  return await getCurrentUserId();
}

// --- MAPEADORES (raw da API -> SearchResult) ---
function mapTmdb(item: TmdbItem, forcedType?: 'MOVIE' | 'TV_SHOW'): SearchResult {
  const type: MediaType = forcedType || (item.media_type === 'tv' ? 'TV_SHOW' : 'MOVIE');
  return {
    id: String(item.id),
    title: item.title || item.name || 'Sem Título',
    overview: item.overview || null,
    releaseYear: item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0] || null,
    creator: null,
    coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    type,
  };
}

function mapRawg(item: RawgItem): SearchResult {
  return {
    id: String(item.id),
    title: item.name,
    overview: null,
    creator: null,
    releaseYear: item.released ? item.released.split('-')[0] : null,
    coverUrl: item.background_image || null,
    type: 'GAME',
  };
}

function mapItunes(item: ItunesItem): SearchResult {
  return {
    id: String(item.collectionId),
    title: item.collectionName,
    creator: item.artistName,
    overview: null,
    releaseYear: item.releaseDate ? item.releaseDate.split('-')[0] : null,
    coverUrl: item.artworkUrl100?.replace('100x100bb', '500x500bb') || null,
    type: 'ALBUM',
  };
}

function mapGoogleBook(book: GoogleBooksItem): SearchResult {
  const info = book.volumeInfo;
  return {
    id: book.id,
    title: info.title || 'Sem Título',
    creator: info.authors ? info.authors.join(', ') : 'Autor Desconhecido',
    overview: info.description || null,
    releaseYear: info.publishedDate ? info.publishedDate.split('-')[0] : null,
    coverUrl: info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace('http:', 'https:') : null,
    type: 'BOOK',
  };
}

// Embaralha um array (Fisher–Yates) — usado na descoberta aleatória.
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const randomPage = (max = 20) => Math.floor(Math.random() * max) + 1;

// Busca as configurações do usuário logado (chaves de API etc.)
async function getUserSettings() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  // Chaves cifradas at-rest; decifra para uso direto (tmdbApiKey, rawgApiKey).
  return decryptSettings(await prisma.settings.findUnique({ where: { userId } }));
}

// --- BUSCA NAS APIs ---

// 🟢 ADICIONADO: 'BOOK' na assinatura da função
export async function searchMedia(query: string, type: 'VIDEO' | 'MUSIC' | 'GAME' | 'BOOK'): Promise<SearchResult[]> {
  if (!query) return [];

  const results: SearchResult[] = [];

  try {
    // 1. MÚSICA (iTunes) — sem chave
    if (type === 'MUSIC') {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=6`);
      const data = await res.json();
      results.push(...(data.results as ItunesItem[]).map(mapItunes));
    }

    // 2. VÍDEO (TMDB) — requer chave (Configurações)
    if (type === 'VIDEO') {
      const settings = await getUserSettings();
      const apiKey = settings?.tmdbApiKey || process.env.TMDB_API_KEY;

      if (apiKey) {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`);
        const data = await res.json();

        const items = (data.results as TmdbItem[])
          .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 8)
          .map((item) => mapTmdb(item));
        results.push(...items);
      }
    }

    // 3. JOGOS (RAWG) — requer chave (Configurações)
    if (type === 'GAME') {
      const settings = await getUserSettings();
      const apiKey = settings?.rawgApiKey || process.env.RAWG_API_KEY;

      if (apiKey) {
        const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=6`);
        const data = await res.json();
        results.push(...(data.results as RawgItem[]).map(mapRawg));
      }
    }

    // 4. LIVROS (Google Books) — chave OPCIONAL (gratuita); melhora cota/qualidade
    if (type === 'BOOK') {
      const settings = await getUserSettings();
      const apiKey = settings?.googleBooksApiKey || process.env.GOOGLE_BOOKS_API_KEY;

      // Sem langRestrict: restringir a `pt` zerava resultados de títulos em inglês.
      // `country` é exigido por algumas rotas da API e evita respostas 403.
      const url = new URL("https://www.googleapis.com/books/v1/volumes");
      url.searchParams.set("q", query);
      url.searchParams.set("maxResults", "12");
      url.searchParams.set("country", "BR");
      if (apiKey) url.searchParams.set("key", apiKey);

      const res = await fetch(url.toString());
      if (!res.ok) {
        // 429 = cota excedida (sem chave costuma estourar rápido). Sinaliza para a UI.
        throw new Error(`GoogleBooks:${res.status}`);
      }
      const data = await res.json();
      if (data.items) results.push(...(data.items as GoogleBooksItem[]).map(mapGoogleBook));
    }

    return results;

  } catch (error) {
    console.error("Erro na busca:", error);
    return [];
  }
}

// --- STATUS DOS PROVEDORES (conexão com as Configurações) ---
// Informa quais provedores que exigem chave estão configurados, para a UI
// orientar o usuário em vez de retornar resultados vazios silenciosamente.
export async function getMediaProviderStatus(): Promise<{ tmdb: boolean; rawg: boolean; googleBooks: boolean }> {
  const settings = await getUserSettings();
  return {
    tmdb: Boolean(settings?.tmdbApiKey || process.env.TMDB_API_KEY),
    rawg: Boolean(settings?.rawgApiKey || process.env.RAWG_API_KEY),
    // Google Books funciona sem chave, mas a chave (gratuita) eleva a cota.
    googleBooks: Boolean(settings?.googleBooksApiKey || process.env.GOOGLE_BOOKS_API_KEY),
  };
}

// --- DESCOBERTA ALEATÓRIA ("Surpreenda-me") ---
const MUSIC_SEEDS = ["rock", "pop", "hip hop", "jazz", "electronic", "mpb", "indie", "classical", "r&b", "metal"];
const BOOK_SUBJECTS = ["fiction", "fantasy", "science", "history", "biography", "romance", "technology", "philosophy", "thriller", "self-help"];

export async function discoverRandomMedia(
  type: 'VIDEO' | 'MUSIC' | 'GAME' | 'BOOK'
): Promise<{ results: SearchResult[]; missingKey?: 'tmdb' | 'rawg' | 'googleBooks' }> {
  try {
    // VÍDEO: populares aleatórios do TMDB (filmes + séries)
    if (type === 'VIDEO') {
      const settings = await getUserSettings();
      const apiKey = settings?.tmdbApiKey || process.env.TMDB_API_KEY;
      if (!apiKey) return { results: [], missingKey: 'tmdb' };

      const page = randomPage(20);
      const [mvRes, tvRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/popular?api_key=${apiKey}&language=pt-BR&page=${page}`),
        fetch(`https://api.themoviedb.org/3/tv/popular?api_key=${apiKey}&language=pt-BR&page=${page}`),
      ]);
      const mv = await mvRes.json();
      const tv = await tvRes.json();
      const items = [
        ...((mv.results as TmdbItem[]) || []).map((i) => mapTmdb(i, 'MOVIE')),
        ...((tv.results as TmdbItem[]) || []).map((i) => mapTmdb(i, 'TV_SHOW')),
      ].filter((i) => i.coverUrl);
      return { results: shuffle(items).slice(0, 8) };
    }

    // JOGOS: mais adicionados, página aleatória (RAWG)
    if (type === 'GAME') {
      const settings = await getUserSettings();
      const apiKey = settings?.rawgApiKey || process.env.RAWG_API_KEY;
      if (!apiKey) return { results: [], missingKey: 'rawg' };

      const page = randomPage(20);
      const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&ordering=-added&page=${page}&page_size=12`);
      const data = await res.json();
      const items = ((data.results as RawgItem[]) || []).map(mapRawg).filter((i) => i.coverUrl);
      return { results: shuffle(items).slice(0, 8) };
    }

    // MÚSICA: gênero-semente aleatório (iTunes, sem chave)
    if (type === 'MUSIC') {
      const term = MUSIC_SEEDS[Math.floor(Math.random() * MUSIC_SEEDS.length)];
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=20`);
      const data = await res.json();
      const items = ((data.results as ItunesItem[]) || []).map(mapItunes).filter((i) => i.coverUrl);
      return { results: shuffle(items).slice(0, 8) };
    }

    // LIVROS: assunto-semente aleatório (Google Books; chave opcional eleva a cota)
    const settings = await getUserSettings();
    const apiKey = settings?.googleBooksApiKey || process.env.GOOGLE_BOOKS_API_KEY;
    const subject = BOOK_SUBJECTS[Math.floor(Math.random() * BOOK_SUBJECTS.length)];
    const startIndex = Math.floor(Math.random() * 10) * 8;

    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.searchParams.set("q", `subject:${subject}`);
    url.searchParams.set("maxResults", "12");
    url.searchParams.set("startIndex", String(startIndex));
    url.searchParams.set("country", "BR");
    if (apiKey) url.searchParams.set("key", apiKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      // Cota estourada sem chave -> sinaliza para a UI sugerir conectar a chave.
      return { results: [], missingKey: 'googleBooks' };
    }
    const data = await res.json();
    const items = ((data.items as GoogleBooksItem[]) || []).map(mapGoogleBook).filter((i) => i.coverUrl);
    return { results: shuffle(items).slice(0, 8) };
  } catch (error) {
    console.error("Erro na descoberta:", error);
    return { results: [] };
  }
}

// --- CRUD DE BANCO DE DADOS ---

export async function addMediaItem(item: SearchResult) {
  try {
    const userId = await getAuthenticatedUserId();
    
    await prisma.mediaItem.create({
      data: {
        userId: userId || null,
        title: item.title,
        type: item.type,
        status: "PLAN_TO_WATCH",
        overview: item.overview,
        coverUrl: item.coverUrl,
        externalId: item.id,
        creator: item.creator,
        releaseYear: item.releaseYear,
      }
    });
    
    revalidatePath("/entertainment");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar:", error);
    return { success: false, message: "Erro ao salvar na sua coleção." };
  }
}

export async function updateMediaStatus(id: string, newStatus: string) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return { success: false, message: "Não autenticado." };
        await prisma.mediaItem.updateMany({
            where: { id, userId },
            data: { status: newStatus }
        });

        revalidatePath("/entertainment");
        return { success: true };
    } catch (error) {
        console.error("Erro ao atualizar status:", error);
        return { success: false, message: "Erro ao atualizar status" };
    }
}

export async function updateMediaDetails(id: string, rating: number, notes: string) {
  try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return { success: false, message: "Não autenticado." };
      await prisma.mediaItem.updateMany({
          where: { id, userId },
          data: {
            rating: rating,
            notes: notes
          }
      });

      revalidatePath("/entertainment");
      return { success: true, message: "Review salva com sucesso!" };
  } catch (error) {
      console.error("Erro ao atualizar detalhes:", error);
      return { success: false, message: "Erro ao salvar review." };
  }
}

export async function deleteMediaItem(id: string) {
  try {
      const userId = await getAuthenticatedUserId();
      if (!userId) return { success: false, message: "Não autenticado." };
      await prisma.mediaItem.updateMany({
          where: { id, userId },
          data: { deletedAt: new Date() }
      });

      revalidatePath("/entertainment");
      return { success: true, message: "Item movido para a lixeira." };
  } catch (error) {
      console.error("Erro ao deletar:", error);
      return { success: false, message: "Erro ao remover item." };
  }
}