"use client";

import { useMemo, useState } from "react";
import { SavedLink } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";

import { createLink, deleteLink } from "@/app/(dashboard)/links/actions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function LinkGrid({ links }: { links: SavedLink[] }) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"new" | "old" | "title">("new");

  const [previewLink, setPreviewLink] = useState<SavedLink | null>(null);
  const [deletingLink, setDeletingLink] = useState<SavedLink | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /** 🔹 Categorias seguras (string SEM null) */
  const categories = useMemo(() => {
    const set = new Set<string>();
    links.forEach((l) => {
      if (l.category && l.category.trim()) {
        set.add(l.category);
      }
    });
    return Array.from(set).sort();
  }, [links]);

  /** 🔹 Lista filtrada + ordenada */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const list = links.filter((l) => {
      const category = l.category || "Geral";
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      if (!q) return true;

      return (
        l.title?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
      );
    });

    if (sortBy === "title") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortBy === "old") {
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    return list;
  }, [links, query, categoryFilter, sortBy]);

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
    } catch {
      toast.dismiss(toastId);
      toast.error("Erro ao criar link.");
    }
  }

  async function confirmDelete() {
    if (!deletingLink) return;
    setIsDeleting(true);

    try {
      const toastId = toast.loading("Removendo link...");
      const result = await deleteLink(deletingLink.id);
      toast.dismiss(toastId);

      result.success
        ? toast.success(result.message || "Link removido.")
        : toast.error(result.message || "Erro ao remover link.");
    } catch {
      toast.error("Erro ao remover link.");
    } finally {
      setIsDeleting(false);
      setDeletingLink(null);
    }
  }

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
      {/* ================= HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
            <Globe className="h-5 w-5" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Biblioteca de Links
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize recursos úteis e acesse rapidamente.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-10 w-64"
            />
          </div>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as typeof sortBy)}
          >
            <SelectTrigger className="w-36">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">Recentes</SelectItem>
              <SelectItem value="old">Antigos</SelectItem>
              <SelectItem value="title">A–Z</SelectItem>
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
                <DialogTitle>Novo Link</DialogTitle>
              </DialogHeader>

              <form action={handleCreate} className="space-y-4">
                <div className="grid gap-3">
                  <div>
                    <Label>Título</Label>
                    <Input name="title" required />
                  </div>

                  <div>
                    <Label>URL</Label>
                    <Input name="url" type="url" required />
                  </div>

                  <div>
                    <Label>Descrição</Label>
                    <Input name="description" />
                  </div>

                  <div>
                    <Label>Imagem</Label>
                    <Input name="imageUrl" />
                  </div>

                  <div>
                    <Label>Categoria</Label>
                    <Input name="category" />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="submit" className="w-full">
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ================= GRID ================= */}
      <ScrollArea className="max-h-[65vh]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* ===== EMPTY STATE ===== */}
          {filtered.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 border border-dashed border-border/60 rounded-2xl bg-muted/30 text-center">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Nenhum link encontrado
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Ajuste os filtros ou adicione um novo recurso.
              </p>
              <Button className="mt-6 gap-2" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" /> Adicionar link
              </Button>
            </div>
          )}

          {filtered.map((link) => (
            <Link
              key={link.id}
              href={link.url}
              target="_blank"
              className="group"
            >
              <Card className="h-full overflow-hidden border-border/60 hover:border-primary/40 transition-all hover:shadow-md">
                <div className="h-36 bg-muted relative overflow-hidden">
                  {link.imageUrl ? (
                    <img
                      src={link.imageUrl}
                      alt={link.title || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}

                  <div className="absolute top-3 right-3 flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="bg-white/80"
                      onClick={(e) => {
                        e.preventDefault();
                        setPreviewLink(link);
                      }}
                    >
                      <Eye className="h-4 w-4 text-primary" />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      className="bg-white/80"
                      onClick={(e) => {
                        e.preventDefault();
                        copyToClipboard(link.url);
                      }}
                    >
                      <Copy className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <Badge className="bg-primary/5 text-primary border border-primary/10">
                    {link.category || "Geral"}
                  </Badge>

                  <h3 className="font-semibold group-hover:text-primary transition-colors">
                    {link.title}
                  </h3>

                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {link.description || link.url}
                  </p>

                  <div className="flex justify-between text-xs text-muted-foreground pt-2">
                    <span>
                      {new Date(link.createdAt).toLocaleDateString()}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setDeletingLink(link);
                      }}
                      className="text-red-500 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </ScrollArea>

      {/* ================= PREVIEW MODAL ================= */}
      <Dialog open={!!previewLink} onOpenChange={() => setPreviewLink(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewLink?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="h-60 rounded-xl overflow-hidden bg-muted">
              {previewLink?.imageUrl ? (
                <img
                  src={previewLink.imageUrl}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {previewLink?.description || "Sem descrição"}
            </p>

            <div className="flex gap-3">
              <Button
                className="flex-1"
                onClick={() =>
                  previewLink && window.open(previewLink.url, "_blank")
                }
              >
                Abrir link
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  previewLink && copyToClipboard(previewLink.url)
                }
              >
                Copiar URL
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= DELETE MODAL ================= */}
      <Dialog open={!!deletingLink} onOpenChange={() => setDeletingLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover link</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover{" "}
            <strong>{deletingLink?.title}</strong>? Essa ação não pode ser
            desfeita.
          </p>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeletingLink(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Removendo..." : "Confirmar remoção"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
