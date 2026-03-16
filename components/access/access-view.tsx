"use client";

import { useState } from "react";
import { AccessItem } from "@prisma/client";
import {
  Briefcase,
  User,
  Search,
  ShieldAlert,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Zap,
  Filter
} from "lucide-react";
import { AccessList } from "@/components/access/access-list";
import { AccessDialog } from "@/components/access/access-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 12;

export function AccessView({ initialItems }: { initialItems: AccessItem[] }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("PERSONAL");

  // 1. Filtragem Inteligente
  const filteredItems = initialItems.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      (item.title?.toLowerCase() ?? "").includes(searchLower) ||
      (item.username?.toLowerCase() ?? "").includes(searchLower) ||
      (item.client?.toLowerCase() ?? "").includes(searchLower) ||
      (item.category?.toLowerCase() ?? "").includes(searchLower)
    );
  });

  const personalItems = filteredItems.filter((item) => !item.client);
  const clientItems = filteredItems.filter((item) => item.client);
  const currentList = activeTab === "PERSONAL" ? personalItems : clientItems;

  // 2. Paginação Tática
  const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = currentPage > totalPages ? 1 : currentPage;
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = currentList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setCurrentPage(1); 
  };

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* --- BARRA DE CONTROLE HUD --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card border border-border/40 p-5 rounded-[2rem] shadow-xl shadow-black/5 backdrop-blur-md">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="PESQUISAR NO COFRE..."
            className="pl-11 h-12 bg-muted/20 border-border/40 focus-visible:ring-primary/20 rounded-2xl font-bold text-xs tracking-widest uppercase placeholder:text-muted-foreground/40 transition-all"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex w-full md:w-auto items-center gap-3 justify-end">
          <Badge variant="outline" className="hidden lg:flex h-10 px-4 rounded-xl border-border/60 font-black uppercase tracking-widest text-[9px] gap-2 bg-muted/10">
            <ShieldCheck className="h-3 w-3 text-emerald-500" /> Criptografia Ativa
          </Badge>
          <AccessDialog />
        </div>
      </div>

      {/* --- ABAS TÁTICAS --- */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <TabsList className="bg-muted/30 p-1.5 rounded-[1.5rem] h-auto border border-border/40 w-full sm:w-auto shadow-inner">
            <TabsTrigger
              value="PERSONAL"
              className="gap-3 px-8 py-3 flex-1 sm:flex-none rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <User className="h-4 w-4 opacity-70" />
              Pessoal
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg ml-2 font-mono text-xs">
                {personalItems.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="CLIENTS"
              className="gap-3 px-8 py-3 flex-1 sm:flex-none rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-lg font-black uppercase tracking-widest text-[10px] transition-all"
            >
              <Briefcase className="h-4 w-4 opacity-70" />
              Clientes
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg ml-2 font-mono text-xs">
                {clientItems.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {search && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                <Filter className="h-3 w-3" /> Filtrando: {search}
            </div>
          )}
        </div>

        {/* --- GRID DE RESULTADOS --- */}
        <div className="min-h-[500px]">
          <TabsContent value="PERSONAL" className="space-y-8 focus-visible:outline-none mt-0">
            {personalItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} />
                <PaginationFooter
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={personalItems.length}
                  onNext={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  onPrev={() => setCurrentPage(p => Math.max(p - 1, 1))}
                />
              </>
            ) : (
              <EmptyState isSearch={search.length > 0} type="PERSONAL" />
            )}
          </TabsContent>

          <TabsContent value="CLIENTS" className="space-y-8 focus-visible:outline-none mt-0">
            {clientItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} />
                <PaginationFooter
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={clientItems.length}
                  onNext={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  onPrev={() => setCurrentPage(p => Math.max(p - 1, 1))}
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

// --- RODAPÉ DE PAGINAÇÃO HUD ---
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
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-8 animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        SCAN_RESULTS: <span className="text-foreground">{Math.min(ITEMS_PER_PAGE * currentPage, totalItems)}</span> / <span className="text-foreground">{totalItems}</span>
      </p>

      <div className="flex items-center gap-3 bg-muted/20 p-1.5 rounded-2xl border border-border/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm disabled:opacity-30 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="px-4 text-[10px] font-black uppercase tracking-widest border-x border-border/40 h-5 flex items-center">
          PÁGINA {currentPage} <span className="mx-2 opacity-30">|</span> {totalPages}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="h-9 w-9 rounded-xl hover:bg-background hover:shadow-sm disabled:opacity-30 transition-all"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// --- EMPTY STATE HUD ---
function EmptyState({ isSearch, type }: { isSearch: boolean; type: "PERSONAL" | "CLIENTS" }) {
  return (
    <Card className="flex flex-col items-center justify-center py-24 border-dashed border-2 border-border/60 bg-muted/5 rounded-[3rem] shadow-inner animate-in zoom-in-95 duration-500">
      <div className="relative mb-8">
        <div className={cn(
            "p-6 rounded-[2rem] bg-background border border-border shadow-2xl transition-all duration-700",
            isSearch ? "rotate-12" : "rotate-0"
        )}>
            {isSearch ? (
              <Search className="h-10 w-10 text-muted-foreground animate-pulse" />
            ) : type === "PERSONAL" ? (
              <KeyRound className="h-10 w-10 text-primary" />
            ) : (
              <ShieldAlert className="h-10 w-10 text-primary" />
            )}
        </div>
        <div className="absolute -top-2 -right-2 h-6 w-6 bg-primary rounded-full animate-ping opacity-20" />
      </div>

      <h3 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-3">
        {isSearch ? "DADOS NÃO ENCONTRADOS" : type === "PERSONAL" ? "COFRE_PESSOAL_VAZIO" : "DADOS_CLIENTE_OFFLINE"}
      </h3>
      
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] max-w-xs text-center leading-relaxed px-6 opacity-60">
        {isSearch 
          ? "NENHUM REGISTRO CORRESPONDE AOS PARÂMETROS DE BUSCA DEFINIDOS."
          : type === "PERSONAL" 
            ? "INICIE O PROTOCOLO DE ARMAZENAMENTO PARA LOGINS, BANCOS E REDES SOCIAIS."
            : "AGUARDANDO INPUT DE CREDENCIAIS DE SERVIDORES E PAINÉIS EXTERNOS."}
      </p>

      {isSearch && (
          <Button variant="link" onClick={() => window.location.reload()} className="mt-6 text-[10px] font-black uppercase tracking-widest text-primary">
              <Zap className="h-3 w-3 mr-2" /> Reiniciar Varredura
          </Button>
      )}
    </Card>
  );
}