"use client";

import dynamic from "next/dynamic";
import type { DashboardWishlist } from "@/components/finance/dashboard/types";
import type { WishlistAccountOption } from "./wishlist-card";

interface WishlistGridProps {
  items: DashboardWishlist[];
  accounts: WishlistAccountOption[];
  totalBalance: number;
}

// Carrega o componente de visualização (Grid de Cards) dinamicamente
const WishlistGrid = dynamic<WishlistGridProps>(
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

export function WishlistGridLoader({ items, accounts, totalBalance }: WishlistGridProps) {
  return <WishlistGrid items={items} accounts={accounts} totalBalance={totalBalance} />;
}
