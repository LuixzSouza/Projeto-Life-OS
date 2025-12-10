"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- TIPAGEM FORTE ---

export type MediaType = 'MOVIE' | 'TV' | 'ALBUM' | 'GAME';

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  type: MediaType;
};

// Interfaces para as respostas das APIs (Evita o 'any')
interface ItunesItem {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl100: string;
}

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  media_type: 'movie' | 'tv';
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

// --- BUSCA NA API ---

export async function searchMedia(query: string, type: 'VIDEO' | 'MUSIC' | 'GAME'): Promise<SearchResult[]> {
  if (!query) return [];

  const results: SearchResult[] = [];

  try {
    // 1. MÚSICA (iTunes)
    if (type === 'MUSIC') {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=5`);
      const data = await res.json();
      
      // Tipagem explícita no map
      const items: SearchResult[] = (data.results as ItunesItem[]).map((item) => ({
        id: String(item.collectionId),
        title: item.collectionName,
        subtitle: item.artistName,
        coverUrl: item.artworkUrl100?.replace('100x100bb', '500x500bb'),
        type: 'ALBUM'
      }));
      results.push(...items);
    }

    // 2. VÍDEO (TMDB)
    if (type === 'VIDEO') {
      const apiKey = process.env.TMDB_API_KEY;
      if (apiKey) {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`);
        const data = await res.json();

        const items: SearchResult[] = (data.results as TmdbItem[])
          .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 5)
          .map((item) => ({
            id: String(item.id),
            title: item.title || item.name || 'Sem Título',
            subtitle: item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : 'N/A'),
            coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            type: item.media_type === 'movie' ? 'MOVIE' : 'TV'
          }));
        results.push(...items);
      }
    }

    // 3. JOGOS (RAWG)
    if (type === 'GAME') {
      const apiKey = process.env.RAWG_API_KEY;
      if (apiKey) {
        const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=5`);
        const data = await res.json();

        const items: SearchResult[] = (data.results as RawgItem[]).map((item) => ({
          id: String(item.id),
          title: item.name,
          subtitle: item.released ? item.released.split('-')[0] : 'TBA',
          coverUrl: item.background_image || null,
          type: 'GAME'
        }));
        results.push(...items);
      }
    }

    return results;

  } catch (error) {
    console.error("Erro na busca:", error);
    return [];
  }
}

// --- CRUD ---

export async function addMediaItem(item: SearchResult) {
  try {
    await prisma.mediaItem.create({
      data: {
        title: item.title,
        subtitle: item.subtitle,
        coverUrl: item.coverUrl,
        type: item.type,
        externalId: item.id,
        category: "WISHLIST" // ✅ Padrão: Vai para a lista de desejos
      }
    });
    revalidatePath("/entertainment");
    return { success: true };
  } catch (error) {
    return { success: false, message: "Erro ao salvar" };
  }
}

export async function updateMediaStatus(id: string, newStatus: string) {
    try {
        await prisma.mediaItem.update({
            where: { id },
            data: { category: newStatus }
        });
        revalidatePath("/entertainment");
        return { success: true };
    } catch (error) {
        return { success: false, message: "Erro ao atualizar status" };
    }
}

export async function deleteMediaItem(id: string) {
  await prisma.mediaItem.delete({ where: { id } });
  revalidatePath("/entertainment");
}