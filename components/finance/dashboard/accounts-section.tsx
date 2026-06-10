"use client";

import { useState } from "react";
import { Wallet, Plus, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountsList } from "@/components/finance/account/accounts-list";
import { AccountDialog } from "@/components/finance/account/account-dialog";
import { ImportStatementDialog } from "@/components/finance/import-statement-dialog";
import type { DashboardAccount } from "./types";

interface AccountsSectionProps {
  accounts: DashboardAccount[];
}

export function AccountsSection({ accounts }: AccountsSectionProps) {
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  return (
    <section id="contas" className="scroll-mt-36">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h3 className="text-xl font-extrabold text-foreground flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl"><Wallet className="h-5 w-5 text-primary" /></div>
          Minhas Contas
        </h3>
        {accounts.length > 0 && (
          <Button
            onClick={() => setIsImportOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 rounded-xl font-bold shrink-0"
          >
            <FileUp className="h-4 w-4" /> <span className="hidden sm:inline">Importar extrato</span>
          </Button>
        )}
      </div>

      {accounts.length > 0 ? (
        <>
          <AccountsList accounts={accounts} />
          <ImportStatementDialog
            open={isImportOpen}
            onOpenChange={setIsImportOpen}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          />
        </>
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
