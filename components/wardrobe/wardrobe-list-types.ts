// --- TIPAGEM ESTRITA ---
export interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  brand: string | null;
  size: string | null;
  color: string | null; // Usaremos isso para gerar a capa sem foto!
  season: string | null;
  imageUrl: string | null;
  price: number | null;
  wearCount: number;
  lastWorn: string | null;
  isFavorite: boolean;
  status: "IN_CLOSET" | "LAUNDRY" | "LENT" | "REPAIR" | "DONATED";
  createdAt: string;
  updatedAt: string;
}
