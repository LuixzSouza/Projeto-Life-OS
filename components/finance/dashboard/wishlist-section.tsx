"use client";

import { ShoppingBag, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AskAiButton } from "@/components/ai/ask-ai-button";
import { WishlistDialog } from "@/components/finance/wishlist/wishlist-dialog";
import { WishlistGridLoader } from "@/components/finance/wishlist/wishlist-grid-loader";
import type { DashboardAccount, DashboardWishlist } from "./types";

interface WishlistSectionProps {
  wishlist: DashboardWishlist[];
  accounts: DashboardAccount[];
  totalBalance: number;
}

export function WishlistSection({ wishlist, accounts, totalBalance }: WishlistSectionProps) {
  const accountOptions = accounts.map((a) => ({ id: a.id, name: a.name, balance: a.balance, isConnected: a.isConnected }));
  return (
    <section id="desejos" className="scroll-mt-36 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-sm">
            <ShoppingBag className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-extrabold text-foreground">Lista de Desejos</h3>
            <p className="text-sm text-muted-foreground mt-0.5 font-medium">Seus desejos comparados com o saldo real das suas contas.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Plano de compra negociado (#26): a IA calcula prazo realista pela
              sobra mensal REAL e propõe a meta — desejo → comportamento. */}
          {wishlist.length > 0 && (
            <AskAiButton
              q="Monte um plano de compra para os itens da minha wishlist: use project_future (WISHLIST) para calcular o prazo realista de cada um pela minha sobra mensal real, priorize, e proponha quanto guardar por semana."
              label="Plano com IA"
              title="A IA monta o plano de compra com base na sua sobra mensal real"
            />
          )}
          <WishlistDialog trigger={
            <Button size="lg" className="rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 px-8">
              <Plus className="h-5 w-5 mr-2" /> Nova Meta
            </Button>
          } />
        </div>
      </div>

      {wishlist.length > 0 ? (
        <div className="pt-4">
          <WishlistGridLoader items={wishlist} accounts={accountOptions} totalBalance={totalBalance} />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 mt-6 transition-colors hover:bg-muted/20">
          <EmptyState
            icon={ShoppingBag}
            title="Sua lista está vazia"
            description="Adicione um item que você deseja comprar — o Life OS avisa quando o saldo das suas contas já cobre o preço."
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
