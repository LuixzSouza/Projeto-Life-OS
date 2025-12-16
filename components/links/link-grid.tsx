"use client";

import { useMemo, useState } from "react";
import { SavedLink } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";

import { createLink, deleteLink } from "@/app/(dashboard)/links/actions";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

import {
  Plus,
  Globe,
  Trash2,
  ExternalLink,
  ImageIcon,
  Search,
  Copy,
  ArrowUpDown,
  Eye,
} from "lucide-react";

/**
 * LinkGrid
 *
 * - mantém todas as funcionalidades anteriores (criar link via Dialog,
 *   abrir em nova aba ao clicar no card)
 * - adiciona: pesquisa, filtro por categoria, ordenação, preview modal,
 *   copiar URL e confirmação de exclusão via modal (sem alert())
 * - sem usar `any`, usando o tipo SavedLink do Prisma
 */

export function LinkGrid({ links }: { links: SavedLink[] }) {
  // UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // filtros e ordenação
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"new" | "old" | "title">("new");

  // preview / confirm dialogs
  const [previewLink, setPreviewLink] = useState<SavedLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<SavedLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // derive category list
  const categories = useMemo(() => {
    const setC = new Set<string>();
    links.forEach((l) => {
      if (l.category && l.category.trim()) setC.add(l.category);
    });
    return Array.from(setC).sort();
  }, [links]);

  // filtered + sorted list
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = links.filter((l) => {
      if (categoryFilter !== "all" && (l.category ?? "Geral") !== categoryFilter) return false;
      if (!q) return true;
      const inTitle = l.title?.toLowerCase().includes(q);
      const inDesc = l.description?.toLowerCase().includes(q);
      const inUrl = l.url?.toLowerCase().includes(q);
      return Boolean(inTitle || inDesc || inUrl);
    });

    if (sortBy === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortBy === "old") {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      // new
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return list;
  }, [links, query, categoryFilter, sortBy]);

  // create handler (form action)
  async function handleCreate(formData: FormData) {
    const toastId = toast.loading("Criando link...");
    try {
      const result = await createLink(formData);
      toast.dismiss(toastId);
      if (result.success) {
        toast.success(result.message);
        setIsCreateOpen(false);
      } else {
        toast.error(result.message || "Erro ao criar link.");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Erro ao criar link.");
    }
  }

  // delete with modal confirm
  async function confirmDelete() {
    if (!deletingLink) return;
    setIsDeleting(true);
    const id = deletingLink.id;
    try {
      const toastId = toast.loading("Removendo link...");
      const result = await deleteLink(id);
      toast.dismiss(toastId);
      if (result.success) {
        toast.success(result.message || "Link removido.");
      } else {
        toast.error(result.message || "Erro ao remover link.");
      }
    } catch {
      toast.error("Erro ao remover link.");
    } finally {
      setIsDeleting(false);
      setDeletingLink(null);
    }
  }

  // copy URL util
  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("URL copiada");
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Globe className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              Biblioteca de Links
            </h2>
            <p className="text-sm text-muted-foreground">Guarde recursos úteis e abra rapidamente.</p>
          </div>
        </div>

        <div className="flex gap-3 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por título, descrição ou URL..."
              className="pl-10 pr-3"
            />
          </div>

          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "new" | "old" | "title")}>
            <SelectTrigger className="w-36">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Mais recentes</SelectItem>
              <SelectItem value="old">Mais antigas</SelectItem>
              <SelectItem value="title">A - Z</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Novo Link
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar novo link</DialogTitle>
              </DialogHeader>

              <form action={handleCreate} className="space-y-4 mt-2">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label>Título</Label>
                    <Input name="title" placeholder="Ex: Vercel Dashboard" required />
                  </div>

                  <div>
                    <Label>URL</Label>
                    <Input name="url" placeholder="https://..." required type="url" />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input name="description" placeholder="Breve descrição (opcional)" />
                  </div>

                  <div>
                    <Label>Imagem (capa)</Label>
                    <Input name="imageUrl" placeholder="https://..." />
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Input name="category" placeholder="Ex: Dev, Design, Utilitários" />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Salvar recurso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* grid */}
      <ScrollArea className="max-h-[65vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-2">
          {filtered.length === 0 && (
            <div className="col-span-full border-2 border-dashed border-border rounded-2xl p-12 text-center bg-muted">
              <div className="mx-auto w-20 h-20 rounded-lg bg-primary/5 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <p className="text-muted-foreground">Nenhum link encontrado.</p>
              <p className="text-sm text-muted-foreground mt-2">Altere os filtros ou adicione um novo recurso.</p>
            </div>
          )}

          {filtered.map((linkItem) => (
            <div key={linkItem.id} className="group">
              <Link href={linkItem.url} target="_blank" className="block">
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg border-border bg-card">
                  <div className="h-36 w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                    {linkItem.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={linkItem.imageUrl}
                        alt={linkItem.title || "cover"}
                        className="object-cover w-full h-full transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-10 w-10" />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
                      <div className="pointer-events-auto flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPreviewLink(linkItem);
                          }}
                          title="Visualizar"
                          className="bg-white/70 hover:bg-white/90"
                        >
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyToClipboard(linkItem.url);
                          }}
                          title="Copiar URL"
                          className="bg-white/70 hover:bg-white/90"
                        >
                          <Copy className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className="text-primary bg-primary/5 border border-primary/10">
                        {linkItem.category || "Geral"}
                      </Badge>

                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="Abrir em nova aba" />
                        </Tooltip>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingLink(linkItem);
                          }}
                          aria-label="Excluir link"
                          className="text-zinc-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {linkItem.title}
                    </h3>

                    <p className="text-sm text-muted-foreground line-clamp-2">{linkItem.description || linkItem.url}</p>

                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(linkItem.createdAt).toLocaleDateString()}</span>
                      <span className="font-mono truncate max-w-[40%]">{new URL(linkItem.url).hostname.replace("www.", "")}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Preview dialog */}
      <Dialog open={!!previewLink} onOpenChange={() => setPreviewLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{previewLink?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="w-full h-52 bg-zinc-100 dark:bg-zinc-900 rounded overflow-hidden">
              {previewLink?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewLink.imageUrl} alt={previewLink.title || "cover"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-10 w-10" />
                </div>
              )}
            </div>

            <p className="text-sm text-foreground">{previewLink?.description || "Sem descrição."}</p>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!previewLink) return;
                  window.open(previewLink.url, "_blank");
                }}
                className="flex-1"
              >
                Abrir
              </Button>

              <Button
                variant="outline"
                onClick={() => previewLink && copyToClipboard(previewLink.url)}
              >
                Copiar URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingLink} onOpenChange={() => setDeletingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover recurso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Deseja remover <strong>{deletingLink?.title}</strong> da sua biblioteca? Esta ação não pode ser desfeita.
            </p>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setDeletingLink(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Removendo..." : "Confirmar remoção"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
