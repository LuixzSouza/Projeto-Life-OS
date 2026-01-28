"use client";

import { useMemo, useState } from "react";
import { SavedLink } from "@prisma/client";
import { toast } from "sonner";
import { deleteLink } from "@/app/(dashboard)/links/actions";
import { LinkForm } from "./link-form";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
  ImageIcon,
  Search,
  Filter,
  MoreVertical,
  Pencil,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

// Configuração de itens por página
const ITEMS_PER_PAGE = 12;

export function LinkGrid({ links }: { links: SavedLink[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1); // Estado da página atual
  
  // States para Modais
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState<SavedLink | null>(null);

  // Extrair categorias únicas
  const categories = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => l.category && set.add(l.category));
    return Array.from(set).sort();
  }, [links]);

  // 1. Filtragem
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter((l) => {
      const matchCat = categoryFilter === "all" || l.category === categoryFilter;
      const matchQuery = !q || 
        l.title.toLowerCase().includes(q) || 
        l.description?.toLowerCase().includes(q) ||
        l.category?.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [links, query, categoryFilter]);

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
        <div className="flex gap-2 w-full md:w-auto">
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
            {paginatedLinks.map((link) => (
            <div key={link.id} className="group relative flex flex-col h-full bg-card border border-border/60 rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                
                {/* Image Area */}
                <div className="h-40 bg-muted relative overflow-hidden">
                {link.imageUrl ? (
                    <img
                    src={link.imageUrl}
                    alt={link.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                )}
                
                {/* Category Badge */}
                <div className="absolute top-3 left-3">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur text-xs font-medium shadow-sm">
                    {link.category || "Geral"}
                    </Badge>
                </div>

                {/* Actions Overlay */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-sm hover:bg-background">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingLink(link)}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar
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
            ))}

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