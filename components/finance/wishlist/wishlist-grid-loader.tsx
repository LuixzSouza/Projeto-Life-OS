"use client";

import dynamic from "next/dynamic";
import { DashboardWishlist } from "@/components/finance/finance-dashboard"; // Importando o tipo que definimos antes

// Carrega o componente de visualização (Grid de Cards) dinamicamente
const WishlistGrid = dynamic<{ items: DashboardWishlist[] }>(
  () => import("./wishlist-card").then((mod) => mod.WishlistGrid),
  {
    ssr: false,
    loading: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-[300px] w-full bg-muted rounded-2xl animate-pulse" />
            <div className="h-[300px] w-full bg-muted rounded-2xl animate-pulse" />
            <div className="h-[300px] w-full bg-muted rounded-2xl animate-pulse" />
        </div>
    )
  }
);

export function WishlistGridLoader({ items }: { items: DashboardWishlist[] }) {
  return <WishlistGrid items={items} />;
}