"use client";

import { SavedLink } from "@prisma/client";
import { createLink, deleteLink } from "@/app/(dashboard)/links/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Globe, Trash2, ExternalLink, ImageIcon, LayoutGrid } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export function LinkGrid({ links }: { links: SavedLink[] }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    async function handleCreate(formData: FormData) {
        const result = await createLink(formData);
        if (result.success) {
            toast.success(result.message);
            setIsDialogOpen(false);
        } else {
            toast.error(result.message);
        }
    }

    async function handleDelete(id: string, e: React.MouseEvent) {
        e.preventDefault(); // Evita abrir o link ao deletar
        if (!confirm("Remover este link?")) return;
        const result = await deleteLink(id);
        if (result.success) toast.success("Link removido.");
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-100">
                    <Globe className="h-6 w-6 text-indigo-500" /> Biblioteca de Links
                </h2>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            <Plus className="h-4 w-4" /> Novo Link
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Adicionar Recurso</DialogTitle>
                        </DialogHeader>
                        <form action={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Título</Label>
                                <Input name="title" placeholder="Ex: Vercel Dashboard" required />
                            </div>
                            <div className="space-y-2">
                                <Label>URL de Destino</Label>
                                <Input name="url" placeholder="https://..." required type="url" />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição (Meta Description)</Label>
                                <Input name="description" placeholder="Para que serve este link?" />
                            </div>
                            <div className="space-y-2">
                                <Label>URL da Imagem (Capa)</Label>
                                <Input name="imageUrl" placeholder="https://..." />
                                <p className="text-[10px] text-zinc-500">Cole o link de uma imagem para ficar bonito.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <Input name="category" placeholder="Ex: Design, Dev, Utilitários" />
                            </div>
                            <DialogFooter>
                                <Button type="submit">Salvar</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.length === 0 && (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                        <LayoutGrid className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500">Sua biblioteca está vazia.</p>
                    </div>
                )}

                {links.map((link) => (
                    <Link href={link.url} key={link.id} target="_blank" className="group">
                        <Card className="overflow-hidden hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 transition-all duration-300 h-full flex flex-col bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                            
                            {/* ÁREA DA IMAGEM (OG IMAGE STYLE) */}
                            <div className="h-32 w-full bg-zinc-100 dark:bg-zinc-900 relative overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
                                {link.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={link.imageUrl} 
                                        alt={link.title} 
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-300 dark:text-zinc-700">
                                        <ImageIcon className="h-10 w-10" />
                                    </div>
                                )}
                                
                                {/* Overlay de Hover com Icone de Link */}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ExternalLink className="text-white drop-shadow-md h-8 w-8" />
                                </div>
                            </div>

                            {/* CONTEÚDO */}
                            <div className="p-4 flex flex-col flex-1">
                                <div className="flex justify-between items-start">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 mb-1">
                                        {link.category || "Geral"}
                                    </span>
                                    <button 
                                        onClick={(e) => handleDelete(link.id, e)}
                                        className="text-zinc-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                
                                <h3 className="font-bold text-zinc-800 dark:text-zinc-100 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                    {link.title}
                                </h3>
                                
                                <p className="text-sm text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                                    {link.description || link.url}
                                </p>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}