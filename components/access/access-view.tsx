"use client";

import { useRef, useState } from "react";
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
  Filter,
  Radar,
  Loader2,
  StickyNote
} from "lucide-react";
import { toast } from "sonner";
import { type VaultAudit, type BreachScan, scanPasswordBreaches } from "@/app/(dashboard)/access/actions";
import { CATEGORY_CONFIG, isNoteItem, type CategoryKey } from "@/components/access/access-helpers";
import { AccessList } from "@/components/access/access-list";
import { AccessDialog } from "@/components/access/access-dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG) as CategoryKey[];

const ITEMS_PER_PAGE = 12;

export function AccessView({ initialItems, audit }: { initialItems: AccessItem[]; audit: VaultAudit }) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("PERSONAL");
  // Filtro de risco: mostra só credenciais frágeis, reutilizadas ou vazadas.
  const [riskOnly, setRiskOnly] = useState(false);
  // Filtro por categoria (FINANCE/SOCIAL/WORK/OTHERS ou "all").
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  // Resultado da verificação de vazamentos (sob demanda).
  const [breach, setBreach] = useState<BreachScan | null>(null);
  const [scanning, setScanning] = useState(false);

  const reusedSet = new Set(audit.reusedIds);
  const breachedSet = new Set(breach?.breachedIds ?? []);
  // Notas não têm senha → nunca entram no cálculo de risco.
  const isAtRisk = (item: AccessItem) =>
    !isNoteItem(item) &&
    ((audit.strengthById[item.id] ?? 0) < 50 || reusedSet.has(item.id) || breachedSet.has(item.id));
  const riskCount = initialItems.filter(isAtRisk).length;

  const handleScanBreaches = async () => {
    setScanning(true);
    try {
      const result = await scanPasswordBreaches();
      setBreach(result);
      if (result.breachedIds.length > 0) {
        toast.error(`${result.breachedIds.length} senha(s) encontrada(s) em vazamentos públicos. Troque-as!`);
        setRiskOnly(true);
        setCurrentPage(1);
      } else {
        toast.success("Nenhuma senha encontrada em vazamentos conhecidos. 🎉");
      }
    } catch {
      toast.error("Falha ao verificar vazamentos. Tente novamente.");
    } finally {
      setScanning(false);
    }
  };

  // 1. Filtragem Inteligente
  const filteredItems = initialItems.filter((item) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (item.title?.toLowerCase() ?? "").includes(searchLower) ||
      (item.username?.toLowerCase() ?? "").includes(searchLower) ||
      (item.client?.toLowerCase() ?? "").includes(searchLower) ||
      (item.notes?.toLowerCase() ?? "").includes(searchLower) ||
      (item.category?.toLowerCase() ?? "").includes(searchLower);
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory && (!riskOnly || isAtRisk(item));
  });

  // Notas (sem senha) têm aba própria; credenciais dividem em Pessoal e Clientes.
  const noteItems = filteredItems.filter((item) => isNoteItem(item));
  const personalItems = filteredItems.filter((item) => !isNoteItem(item) && !item.client);
  const clientItems = filteredItems.filter((item) => !isNoteItem(item) && item.client);
  const currentList =
    activeTab === "PERSONAL" ? personalItems : activeTab === "CLIENTS" ? clientItems : noteItems;

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

  // Trocar de página: além de mudar o estado, rola para o topo da lista — assim o
  // usuário vê o conteúdo novo (e não fica preso no rodapé, perto dos FABs fixos).
  const topRef = useRef<HTMLDivElement>(null);
  const goToPage = (p: number) => {
    setCurrentPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    // pb-36: folga p/ a paginação não ficar embaixo dos FABs fixos (QuickDock/
    // FocusDock, bottom-right z-50) — senão o botão "próximo" fica sem clique.
    <div className="space-y-8 pb-36 animate-in fade-in duration-700">
      {/* Âncora para rolar ao topo ao paginar (scroll-mt evita ficar sob o header fixo) */}
      <div ref={topRef} className="scroll-mt-24" />

      {/* --- BARRA DE CONTROLE --- */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Pesquisar no cofre…"
            className="pl-10 h-11 bg-muted/20 border-border/40 focus-visible:ring-primary/20 rounded-xl transition-all"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex w-full md:w-auto items-center gap-3 justify-end flex-wrap">
          {/* Filtro por categoria */}
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-10 w-[150px] rounded-xl border-border/40 bg-muted/10 text-xs font-medium">
              <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-sm">Todas as categorias</SelectItem>
              {CATEGORY_KEYS.map((key) => (
                <SelectItem key={key} value={key} className="text-sm">{CATEGORY_CONFIG[key].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Verificar vazamentos (HaveIBeenPwned) */}
          <Button
            variant="outline"
            onClick={handleScanBreaches}
            disabled={scanning}
            title="Verifica se suas senhas apareceram em vazamentos públicos (privado, via k-anonymity)"
            className="h-10 gap-2 rounded-xl border-border/40 bg-muted/10 px-4 text-xs font-medium hover:bg-muted"
          >
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
            {scanning ? "Verificando…" : "Vazamentos"}
          </Button>

          {/* Filtro de risco — só aparece quando há credenciais frágeis/repetidas/vazadas */}
          {riskCount > 0 && (
            <Button
              variant="outline"
              onClick={() => { setRiskOnly((v) => !v); setCurrentPage(1); }}
              className={cn(
                "h-10 gap-2 rounded-xl px-4 text-xs font-medium transition-all",
                riskOnly
                  ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600"
                  : "border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {riskOnly ? "Vendo riscos" : "Em risco"}
              <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10px]", riskOnly ? "bg-white/20" : "bg-rose-500/15")}>{riskCount}</span>
            </Button>
          )}
          <Badge variant="outline" className="hidden lg:flex h-10 items-center gap-2 rounded-xl border-border/60 bg-emerald-500/5 px-3 text-xs font-medium text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" /> Criptografado
          </Badge>
          <AccessDialog />
        </div>
      </div>

      {/* --- ABAS --- */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <TabsList className="h-auto w-full rounded-2xl border border-border/40 bg-muted/30 p-1.5 sm:w-auto">
            <TabsTrigger
              value="PERSONAL"
              className="flex-1 gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"
            >
              <User className="h-4 w-4 opacity-70" />
              Pessoal
              <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                {personalItems.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="CLIENTS"
              className="flex-1 gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"
            >
              <Briefcase className="h-4 w-4 opacity-70" />
              Clientes
              <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                {clientItems.length}
              </span>
            </TabsTrigger>

            <TabsTrigger
              value="NOTES"
              className="flex-1 gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:flex-none"
            >
              <StickyNote className="h-4 w-4 opacity-70" />
              Notas
              <span className="ml-1 rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                {noteItems.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {search && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Filter className="h-3.5 w-3.5" /> Filtrando por “{search}”
            </div>
          )}
        </div>

        {/* --- GRID DE RESULTADOS --- */}
        <div className="min-h-[500px]">
          <TabsContent value="PERSONAL" className="space-y-8 focus-visible:outline-none mt-0">
            {personalItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} strengthById={audit.strengthById} reusedIds={audit.reusedIds} breachCounts={breach?.breachCounts} />
                <PaginationFooter
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={personalItems.length}
                  onPage={goToPage}
                />
              </>
            ) : (
              <EmptyState isSearch={search.length > 0} type="PERSONAL" />
            )}
          </TabsContent>

          <TabsContent value="CLIENTS" className="space-y-8 focus-visible:outline-none mt-0">
            {clientItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} strengthById={audit.strengthById} reusedIds={audit.reusedIds} breachCounts={breach?.breachCounts} />
                <PaginationFooter
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={clientItems.length}
                  onPage={goToPage}
                />
              </>
            ) : (
              <EmptyState isSearch={search.length > 0} type="CLIENTS" />
            )}
          </TabsContent>

          <TabsContent value="NOTES" className="space-y-8 focus-visible:outline-none mt-0">
            {noteItems.length > 0 ? (
              <>
                <AccessList items={paginatedItems} strengthById={audit.strengthById} reusedIds={audit.reusedIds} breachCounts={breach?.breachCounts} />
                <PaginationFooter
                  currentPage={safeCurrentPage}
                  totalPages={totalPages}
                  totalItems={noteItems.length}
                  onPage={goToPage}
                />
              </>
            ) : (
              <EmptyState isSearch={search.length > 0} type="NOTES" />
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

// Lista de páginas com reticências: sempre mostra 1, a última e uma janela ao redor
// da atual (ex.: 1 … 4 5 6 … 20). Evita uma fileira gigante de números.
function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

// Rodapé de paginação: intervalo legível + números de página clicáveis.
function PaginationFooter({
  currentPage,
  totalPages,
  totalItems,
  onPage,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);
  const pages = buildPageList(currentPage, totalPages);

  return (
    // Botões CENTRALIZADOS de propósito: ficam longe do canto inferior direito, onde
    // moram os FABs fixos (QuickDock/FocusDock) — assim nada rouba o clique do "próximo".
    <div className="flex flex-col items-center gap-3 border-t border-border/40 pt-6">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPage(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-lg disabled:opacity-40"
          aria-label="Página anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e${i}`} className="px-1.5 text-sm text-muted-foreground/60 select-none">…</span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? "default" : "ghost"}
              size="icon"
              onClick={() => onPage(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={cn(
                "h-9 w-9 rounded-lg text-sm font-semibold tabular-nums",
                p === currentPage ? "shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={() => onPage(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="h-9 w-9 rounded-lg disabled:opacity-40"
          aria-label="Próxima página"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Mostrando <span className="font-semibold text-foreground">{from}–{to}</span> de{" "}
        <span className="font-semibold text-foreground">{totalItems}</span>
      </p>
    </div>
  );
}

// --- ESTADO VAZIO ---
function EmptyState({ isSearch, type }: { isSearch: boolean; type: "PERSONAL" | "CLIENTS" | "NOTES" }) {
  const title = isSearch
    ? "Nada encontrado"
    : type === "PERSONAL"
      ? "Seu cofre está vazio"
      : type === "CLIENTS"
        ? "Nenhuma credencial de cliente"
        : "Nenhuma anotação ainda";
  const description = isSearch
    ? "Nada corresponde à sua busca. Tente outro termo ou limpe os filtros."
    : type === "PERSONAL"
      ? "Guarde aqui seus logins, bancos e redes sociais — tudo criptografado e só seu."
      : type === "CLIENTS"
        ? "Cadastre as credenciais de servidores e painéis dos seus clientes."
        : "Anote textos e lembretes rápidos — senha do Wi-Fi, códigos, observações. Sem senha, só pra lembrar.";
  return (
    <Card className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/60 bg-muted/5 py-20 animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/60 bg-background shadow-sm">
        {isSearch ? (
          <Search className="h-7 w-7 text-muted-foreground" />
        ) : type === "PERSONAL" ? (
          <KeyRound className="h-7 w-7 text-primary" />
        ) : type === "CLIENTS" ? (
          <Briefcase className="h-7 w-7 text-primary" />
        ) : (
          <StickyNote className="h-7 w-7 text-primary" />
        )}
      </div>

      <h3 className="mb-1.5 text-lg font-bold text-foreground">{title}</h3>

      <p className="max-w-xs px-6 text-center text-sm leading-relaxed text-muted-foreground">{description}</p>

      {isSearch && (
        <Button variant="link" onClick={() => window.location.reload()} className="mt-4 gap-1.5 text-sm font-medium text-primary">
          <Zap className="h-3.5 w-3.5" /> Limpar e recarregar
        </Button>
      )}
    </Card>
  );
}