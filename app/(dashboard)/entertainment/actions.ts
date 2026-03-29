"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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

// Helper para pegar usuário 
async function getAuthenticatedUserId() {
  const user = await prisma.user.findFirst();
  return user?.id;
}

// --- BUSCA NAS APIs ---

// 🟢 ADICIONADO: 'BOOK' na assinatura da função
export async function searchMedia(query: string, type: 'VIDEO' | 'MUSIC' | 'GAME' | 'BOOK'): Promise<SearchResult[]> {
  if (!query) return [];

  const results: SearchResult[] = [];

  try {
    // 1. MÚSICA (iTunes)
    if (type === 'MUSIC') {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=6`);
      const data = await res.json();
      
      const items: SearchResult[] = (data.results as ItunesItem[]).map((item) => ({
        id: String(item.collectionId),
        title: item.collectionName,
        creator: item.artistName, 
        overview: null,
        releaseYear: item.releaseDate ? item.releaseDate.split('-')[0] : null,
        coverUrl: item.artworkUrl100?.replace('100x100bb', '500x500bb'), // Pega imagem em alta resolução
        type: 'ALBUM'
      }));
      results.push(...items);
    }

    // 2. VÍDEO (TMDB)
    if (type === 'VIDEO') {
      const settings = await prisma.settings.findFirst();
      const apiKey = settings?.tmdbApiKey || process.env.TMDB_API_KEY;
      
      if (apiKey) {
        const res = await fetch(`https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`);
        const data = await res.json();

        const items: SearchResult[] = (data.results as TmdbItem[])
          .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
          .slice(0, 8)
          .map((item) => ({
            id: String(item.id),
            title: item.title || item.name || 'Sem Título',
            overview: item.overview || null,
            releaseYear: item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : null),
            creator: null,
            coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
            type: item.media_type === 'movie' ? 'MOVIE' : 'TV_SHOW'
          }));
        results.push(...items);
      }
    }

    // 3. JOGOS (RAWG)
    if (type === 'GAME') {
      const settings = await prisma.settings.findFirst();
      const apiKey = settings?.rawgApiKey || process.env.RAWG_API_KEY;

      if (apiKey) {
        const res = await fetch(`https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=6`);
        const data = await res.json();

        const items: SearchResult[] = (data.results as RawgItem[]).map((item) => ({
          id: String(item.id),
          title: item.name,
          overview: null,
          creator: null,
          releaseYear: item.released ? item.released.split('-')[0] : null,
          coverUrl: item.background_image || null,
          type: 'GAME'
        }));
        results.push(...items);
      }
    }

    // 🟢 4. LIVROS (Google Books)
    if (type === 'BOOK') {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=pt`);
      const data = await res.json();

      if (data.items) {
        const items: SearchResult[] = (data.items as GoogleBooksItem[]).map((book) => {
          const info = book.volumeInfo;
          return {
            id: book.id,
            title: info.title || 'Sem Título',
            // Junta os autores se houver mais de um
            creator: info.authors ? info.authors.join(', ') : 'Autor Desconhecido',
            overview: info.description || null,
            releaseYear: info.publishedDate ? info.publishedDate.split('-')[0] : null,
            // Força HTTPS para evitar erro de Mixed Content no Next.js
            coverUrl: info.imageLinks?.thumbnail ? info.imageLinks.thumbnail.replace('http:', 'https:') : null,
            type: 'BOOK'
          };
        });
        results.push(...items);
      }
    }

    return results;

  } catch (error) {
    console.error("Erro na busca:", error);
    return [];
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
        await prisma.mediaItem.update({
            where: { id: id },
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
      await prisma.mediaItem.update({
          where: { id: id },
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
      await prisma.mediaItem.delete({ 
          where: { id: id } 
      });
      
      revalidatePath("/entertainment");
      return { success: true, message: "Item removido com sucesso." };
  } catch (error) {
      console.error("Erro ao deletar:", error);
      return { success: false, message: "Erro ao remover item." };
  }
}