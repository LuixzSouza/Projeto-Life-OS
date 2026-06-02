"use client";

import { ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WishlistDialog } from "@/components/finance/wishlist/wishlist-dialog";
import { WishlistGridLoader } from "@/components/finance/wishlist/wishlist-grid-loader";
import type { DashboardWishlist } from "./types";

interface WishlistSectionProps {
  wishlist: DashboardWishlist[];
}

export function WishlistSection({ wishlist }: WishlistSectionProps) {
  return (
    <section className="px-6 md:px-8 py-10 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-sm">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-foreground">Lista de Desejos</h3>
            <p className="text-sm text-muted-foreground mt-0.5 font-medium">Planejamento de compras e metas financeiras.</p>
          </div>
        </div>
        <WishlistDialog trigger={
          <Button size="lg" className="rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 px-8">
            <Plus className="h-5 w-5 mr-2" /> Nova Meta
          </Button>
        } />
      </div>

      {wishlist.length > 0 ? (
        <div className="pt-4">
          <WishlistGridLoader items={wishlist} />
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border/60 bg-muted/10 mt-6 transition-colors hover:bg-muted/20">
          <EmptyState
            icon={ShoppingBag}
            title="Sua lista está vazia"
            description="Adicione um item que você deseja comprar no futuro para acompanhar o progresso financeiro."
            action={
              <WishlistDialog
                trigger={
                  <Button variant="default" className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 mt-2 transition-all active:scale-95">
                    <Plus className="h-4 w-4 mr-2" /> Criar Meta
                  </Button>
                }
              />
            }
          />
        </div>
      )}
    </section>
  );
}
