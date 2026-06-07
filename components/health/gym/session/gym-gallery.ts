"use client";

// Galeria de fotos dos treinos (local-first): guardadas em IndexedDB (suporta
// muito mais que o localStorage, ideal para imagens base64) e exibidas inline,
// sem rota/bucket. Cada foto guarda data + stats do dia para o card de
// compartilhamento e para agrupar por data.

export interface GalleryPhoto {
  id: string;
  dataUrl: string;
  date: string;        // ISO
  title: string;
  volume?: number;     // kg
  durationMin?: number;
  sets?: number;
}

const DB_NAME = "lifeos-gym";
const STORE = "gallery";
const MAX_PHOTOS = 300;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no-idb")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Todas as fotos, mais recentes primeiro. */
export async function loadGallery(): Promise<GalleryPhoto[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
      req.onsuccess = () => {
        const list = (req.result as GalleryPhoto[]) ?? [];
        list.sort((a, b) => (a.date < b.date ? 1 : -1));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/** Adiciona fotos e devolve a galeria atualizada (poda as mais antigas). */
export async function addGalleryPhotos(photos: GalleryPhoto[]): Promise<GalleryPhoto[]> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const p of photos) store.put(p);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    const all = await loadGallery();
    // Poda excedente (mais antigas).
    if (all.length > MAX_PHOTOS) {
      const db2 = await openDb();
      const tx = db2.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const old of all.slice(MAX_PHOTOS)) store.delete(old.id);
      return all.slice(0, MAX_PHOTOS);
    }
    return all;
  } catch {
    return loadGallery();
  }
}

export async function removeGalleryPhoto(id: string): Promise<GalleryPhoto[]> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignora */
  }
  return loadGallery();
}

/** Comprime uma imagem (File) para um data URL JPEG menor (portátil/local-first). */
export function compressToDataUrl(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        let { width, height } = img;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(src); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
