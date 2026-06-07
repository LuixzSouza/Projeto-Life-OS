"use client";

import { useMemo, useState } from "react";
import { SavedLink } from "@prisma/client";
import { toast } from "sonner";
import { deleteLink, checkLinksHealth, type LinkHealth } from "@/app/(dashboard)/links/actions";
import { LinkForm } from "./link-form";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

import {
  Plus,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Radar,
  Loader2,
  Copy,
  WifiOff,
  Check,
  Tag as TagIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

// Configuração de itens por página
const ITEMS_PER_PAGE = 12;

// Extrai o domínio de um URL (para favicon e exibição).
function getDomain(url: string): string | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function LinkGrid({ links }: { links: SavedLink[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1); // Estado da página atual
  
  // States para Modais
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);
  const [taggingLink, setTaggingLink] = useState<SavedLink | null>(null);

  // Verificação de saúde dos links (detecção de quebrados/offline)
  const [health, setHealth] = useState<LinkHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [brokenOnly, setBrokenOnly] = useState(false);

  const handleCheckHealth = async () => {
    setChecking(true);
    try {
      const res = await checkLinksHealth();
      setHealth(res);
      if (res.brokenIds.length > 0) {
        toast.error(`${res.brokenIds.length} link(s) quebrado(s) ou offline encontrado(s).`);
        setBrokenOnly(true);
        setCurrentPage(1);
      } else {
        toast.success(`Todos os ${res.checked} links estão acessíveis. 🎉`);
      }
    } catch {
      toast.error("Falha ao verificar os links.");
    } finally {
      setChecking(false);
    }
  };

  const handleCopyUrl = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("URL copiada!", { duration: 1500 });
    } catch {
      toast.error("Falha ao copiar a URL.");
    }
  };

  // Extrair categorias únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => l.category && set.add(l.category));
    return Array.from(set).sort();
  }, [links]);

  const brokenSet = useMemo(() => new Set(health?.brokenIds ?? []), [health]);

  // 1. Filtragem
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((l) => {
      const matchCat = categoryFilter === "all" || l.category === categoryFilter;
      const matchQuery = !q ||
        l.title.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q);
      const matchBroken = !brokenOnly || brokenSet.has(l.id);
      return matchCat && matchQuery && matchBroken;
    });
  }, [links, query, categoryFilter, brokenOnly, brokenSet]);

  // 2. Lógica de Paginação
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedLinks = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Handlers de Mudança (Resetam a página)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setCurrentPage(1); // Volta para página 1 ao pesquisar
  };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setCurrentPage(1); // Volta para página 1 ao filtrar
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const res = await deleteLink(deletingId);
    if (res.success) toast.success(res.message);
    else toast.error(res.message);
    setDeletingId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* === CONTROLS === */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-card/50 p-4 rounded-xl border border-border/50 shadow-sm backdrop-blur-sm">
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar recursos..."
            className="pl-10 bg-background/50"
            value={query}
            onChange={handleSearchChange}
          />
        </div>

        {/* Filters & Actions */}
        <div className="flex gap-2 w-full md:w-auto flex-wrap">
          <Select value={categoryFilter} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Verificar saúde dos links */}
          <Button
            variant="outline"
            onClick={handleCheckHealth}
            disabled={checking}
            title="Verifica quais links ainda estão acessíveis"
            className="gap-2"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            <span className="hidden sm:inline">{checking ? "Verificando..." : "Verificar"}</span>
          </Button>

          {/* Filtro de quebrados — só aparece após uma verificação que achou problemas */}
          {brokenSet.size > 0 && (
            <Button
              variant="outline"
              onClick={() => { setBrokenOnly((v) => !v); setCurrentPage(1); }}
              className={cn(
                "gap-2 transition-colors",
                brokenOnly
                  ? "bg-rose-500 text-white border-rose-500 hover:bg-rose-600"
                  : "border-rose-500/30 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
              )}
            >
              <WifiOff className="h-4 w-4" />
              <span>{brokenOnly ? "Quebrados" : "Quebrados"}</span>
              <span className={cn("px-1.5 rounded-md text-xs font-bold", brokenOnly ? "bg-white/20" : "bg-rose-500/15")}>{brokenSet.size}</span>
            </Button>
          )}

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-md">
                <Plus className="h-4 w-4" /> Novo Recurso
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Adicionar Recurso</DialogTitle>
              </DialogHeader>
              <LinkForm onClose={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* === GRID PAGINADO === */}
      <div className="min-h-[400px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedLinks.map((link) => {
            const domain = getDomain(link.url);
            const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
            const isBroken = health?.statusById[link.id] === "broken";
            const isOk = health?.statusById[link.id] === "ok";

            return (
            <div key={link.id} className={cn(
              "group relative flex flex-col h-full bg-card border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300",
              isBroken ? "border-rose-500/40" : "border-border/60 hover:border-primary/30"
            )}>

                {/* Image Area */}
                <div className="h-40 bg-muted relative overflow-hidden">
                {link.imageUrl ? (
                    <img
                    src={link.imageUrl}
                    alt={link.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                ) : (
                    // Fallback frictionless: favicon do domínio sobre gradiente.
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 via-muted to-muted/50">
                    {faviconUrl ? (
                      <img src={faviconUrl} alt={domain ?? link.title} className="h-12 w-12 rounded-xl shadow-sm bg-background p-1.5 border border-border/40" />
                    ) : (
                      <span className="text-3xl font-black text-muted-foreground/30 uppercase">{link.title.slice(0, 2)}</span>
                    )}
                    </div>
                )}

                {/* Badges (categoria + status) */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs font-medium shadow-sm">
                    {link.category || "Geral"}
                    </Badge>
                    {isBroken && (
                      <Badge className="bg-rose-500 text-white border-none text-xs font-bold shadow-sm gap-1">
                        <WifiOff className="h-3 w-3" /> Offline
                      </Badge>
                    )}
                    {isOk && (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] ring-2 ring-background" title="Acessível" />
                    )}
                </div>

                {/* Actions Overlay */}
                <div className="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-sm hover:bg-background">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleCopyUrl(link.url, link.id)}>
                                {copiedId === link.id ? <Check className="mr-2 h-4 w-4 text-emerald-600" /> : <Copy className="mr-2 h-4 w-4" />} Copiar URL
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditingLink(link)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTaggingLink(link)}>
                                <TagIcon className="mr-2 h-4 w-4" /> Tags & Anexos
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setDeletingId(link.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Remover
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                </div>

                {/* Content Area */}
                <div className="p-4 flex flex-col flex-1 gap-2">
                <div className="flex justify-between items-start gap-2">
                    <h3 className="font-semibold text-foreground line-clamp-1" title={link.title}>
                    {link.title}
                    </h3>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {link.description || "Sem descrição definida."}
                </p>

                <div className="mt-auto pt-3">
                    <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                    >
                        <Button variant="outline" size="sm" className="w-full gap-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 group/btn">
                            Acessar Link
                            <ExternalLink className="h-3 w-3 transition-transform group-hover/btn:-translate-y-0.5 group-hover/btn:translate-x-0.5" />
                        </Button>
                    </a>
                </div>
                </div>
            </div>
            );
            })}

            {filtered.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Search className="h-12 w-12 mb-4 opacity-20" />
                    <p>Nenhum link encontrado para sua busca.</p>
                </div>
            )}
        </div>
      </div>

      {/* === PAGINAÇÃO FOOTER === */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <p className="text-xs text-muted-foreground">
                Mostrando <span className="font-medium text-foreground">{paginatedLinks.length}</span> de <span className="font-medium text-foreground">{filtered.length}</span> links
            </p>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
      )}

      {/* === MODAL DE EDIÇÃO === */}
      <Dialog open={!!editingLink} onOpenChange={() => setEditingLink(null)}>
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
            <DialogTitle>Editar Recurso</DialogTitle>
            </DialogHeader>
            {editingLink && (
                <LinkForm
                    onClose={() => setEditingLink(null)}
                    initialData={editingLink}
                />
            )}
        </DialogContent>
      </Dialog>

      {/* === MODAL DE TAGS & ANEXOS (tecido conectivo cross-módulo) === */}
      <EntityConnectionsDialog
        entityType="link"
        item={taggingLink ? { id: taggingLink.id, title: taggingLink.title } : null}
        onOpenChange={(o) => !o && setTaggingLink(null)}
      />

      {/* Delete Modal */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover recurso?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente o link da sua biblioteca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}