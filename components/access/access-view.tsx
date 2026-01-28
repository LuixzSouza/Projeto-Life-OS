"use client";

import { useState } from "react"; // Removi useEffect pois não é mais necessário
import { AccessItem } from "@prisma/client";
import {
  Briefcase,
  User,
  Search,
  ShieldAlert,
  KeyRound,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AccessList } from "@/components/access/access-list";
import { AccessDialog } from "@/components/access/access-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ITEMS_PER_PAGE = 12;

export function AccessView({ initialItems }: { initialItems: AccessItem[] }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("PERSONAL");

  // 1. Lógica de Filtragem
  const filteredItems = initialItems.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (item.title?.toLowerCase() ?? "").includes(searchLower) ||
      (item.username?.toLowerCase() ?? "").includes(searchLower) ||
      (item.client?.toLowerCase() ?? "").includes(searchLower) ||
      (item.category?.toLowerCase() ?? "").includes(searchLower);

    return matchesSearch;
  });

  // 2. Separação por Abas
  const personalItems = filteredItems.filter((item) => !item.client);
  const clientItems = filteredItems.filter((item) => item.client);

  // 3. Define qual lista está ativa
  const currentList = activeTab === "PERSONAL" ? personalItems : clientItems;

  // 4. Lógica de Paginação
  const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
  
  // Segurança: Se a página atual for maior que o total (ex: filtrou e sobrou pouco), volta pra 1
  // Isso resolve o problema sem usar useEffect
  const safeCurrentPage = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;
  
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = currentList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Handlers
  const goToNext = () => setCurrentPage((p) => Math.min(p + 1, totalPages));
  const goToPrev = () => setCurrentPage((p) => Math.max(p - 1, 1));

  // --- FUNÇÕES DE CONTROLE (AQUI ESTÁ A CORREÇÃO) ---
  
  // Ao buscar, atualizamos o texto E resetamos a página na mesma ação
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1); 
  };

  // Ao trocar aba, atualizamos a aba E resetamos a página na mesma ação
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* --- BARRA DE CONTROLE --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/50 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, usuário ou cliente..."
            className="pl-10 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all"
            value={search}
            onChange={handleSearchChange} // Usando o novo handler
          />
        </div>

        <div className="flex w-full md:w-auto justify-end">
          <AccessDialog />
        </div>
      </div>

      {/* --- ABAS E CONTEÚDO --- */}
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange} // Usando o novo handler
        className="space-y-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto border border-border/50 w-full sm:w-auto">
            <TabsTrigger
              value="PERSONAL"
              className="gap-2 px-6 py-2 flex-1 sm:flex-none rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
            >
              <User className="h-4 w-4" />
              Pessoal
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-[10px] bg-zinc-200 dark:bg-zinc-700"
              >
                {personalItems.length}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="CLIENTS"
              className="gap-2 px-6 py-2 flex-1 sm:flex-none rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all"
            >
              <Briefcase className="h-4 w-4" />
              Clientes
              <Badge
                variant="secondary"
                className="ml-1.5 h-5 px-1.5 text-[10px] bg-zinc-200 dark:bg-zinc-700"
              >
                {clientItems.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ÁREA DE LISTA COM PAGINAÇÃO */}
        <div className="min-h-[400px]">
          <TabsContent value="PERSONAL" className="space-y-6 focus-visible:outline-none mt-0">
            {personalItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} />
                <PaginationFooter
                  currentPage={safeCurrentPage} // Usando safeCurrentPage
                  totalPages={totalPages}
                  totalItems={personalItems.length}
                  onNext={goToNext}
                  onPrev={goToPrev}
                />
              </>
            ) : (
              <EmptyState isSearch={search.length > 0} type="PERSONAL" />
            )}
          </TabsContent>

          <TabsContent value="CLIENTS" className="space-y-6 focus-visible:outline-none mt-0">
            {clientItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} showClientBadge />
                <PaginationFooter
                  currentPage={safeCurrentPage} // Usando safeCurrentPage
                  totalPages={totalPages}
                  totalItems={clientItems.length}
                  onNext={goToNext}
                  onPrev={goToPrev}
                />
              </>
            ) : (
              <EmptyState isSearch={search.length > 0} type="CLIENTS" />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// --- RODAPÉ (Mantido igual) ---
function PaginationFooter({
  currentPage,
  totalPages,
  totalItems,
  onNext,
  onPrev,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onNext: () => void;
  onPrev: () => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border/40 pt-4 animate-in fade-in slide-in-from-bottom-2">
      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-medium text-foreground">{Math.min(ITEMS_PER_PAGE * currentPage, totalItems)}</span> de{" "}
        <span className="font-medium text-foreground">{totalItems}</span> resultados
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={currentPage === 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium min-w-[60px] text-center">
          Pág {currentPage} de {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- EMPTY STATE (Mantido igual) ---
function EmptyState({ isSearch, type }: { isSearch: boolean; type: "PERSONAL" | "CLIENTS" }) {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-in zoom-in-95 duration-300">
        <div className="p-4 rounded-full bg-muted mb-4 opacity-50">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">Nenhum resultado encontrado</h3>
        <p className="text-muted-foreground text-sm max-w-xs mt-1">
          Tente buscar por outro termo ou verifique a ortografia.
        </p>
      </div>
    );
  }

  return (
    <Card className="flex flex-col items-center justify-center py-20 border-dashed border-2 bg-muted/5 shadow-none">
      <div className="p-4 rounded-full bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
        {type === "PERSONAL" ? (
          <KeyRound className="h-8 w-8" />
        ) : (
          <ShieldAlert className="h-8 w-8" />
        )}
      </div>
      <h3 className="text-xl font-semibold text-foreground">
        {type === "PERSONAL"
          ? "Cofre Pessoal Vazio"
          : "Sem Acessos de Clientes"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-2 text-center px-4">
        {type === "PERSONAL"
          ? "Adicione logins de bancos, redes sociais e serviços pessoais com segurança máxima."
          : "Centralize as senhas de servidores, painéis e contas dos seus clientes aqui."}
      </p>
    </Card>
  );
}