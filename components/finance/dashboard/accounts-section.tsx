"use client";

import { useState } from "react";
import { Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountsList } from "@/components/finance/account/accounts-list";
import { AccountDialog } from "@/components/finance/account/account-dialog";
import type { DashboardAccount } from "./types";

interface AccountsSectionProps {
  accounts: DashboardAccount[];
}

export function AccountsSection({ accounts }: AccountsSectionProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <section className="px-6 md:px-8 py-10 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-extrabold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Wallet className="h-5 w-5 text-primary" /></div>
          Minhas Contas
        </h3>
        {accounts.length > 0 && (
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground hidden sm:block bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
            Deslize para ver mais →
          </span>
        )}
      </div>

      {accounts.length > 0 ? (
        <AccountsList accounts={accounts} />
      ) : (
        <div className="rounded-[2rem] border border-dashed border-border/60 bg-muted/10 transition-colors hover:bg-muted/20">
          <EmptyState
            icon={Wallet}
            title="Nenhuma conta conectada"
            description="Adicione sua primeira conta bancária ou carteira manual para começar a organizar seu dinheiro."
            action={
              <AccountDialog
                open={isAccountOpen}
                onOpenChange={setIsAccountOpen}
                trigger={
                  <Button className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={() => setIsAccountOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Criar Carteira
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
