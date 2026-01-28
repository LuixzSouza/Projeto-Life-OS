"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Loader2, Wand2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { createLink, updateLink, fetchMetadata } from "@/app/(dashboard)/links/actions";
import { SavedLink } from "@prisma/client"; // Importe o tipo do Prisma

const SUGGESTED_CATEGORIES = [
  "Ferramentas & Utilitários",
  "Design / UI / Fontes",
  "Dev Front-end",
  "Dev Backend / Fullstack",
  "Games & Mapas",
  "Estudos & Organização",
  "Negócios / Vendas",
  "Otimização Web"
];

// Aceita dados iniciais para edição
export function LinkForm({ onClose, initialData }: { onClose: () => void, initialData?: SavedLink }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  
  const [formData, setFormData] = useState({
    url: initialData?.url || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    imageUrl: initialData?.imageUrl || "",
    category: initialData?.category || ""
  });

  const handleFetchMeta = async () => {
    if (!formData.url) return toast.error("Digite uma URL primeiro.");
    
    setFetching(true);
    const res = await fetchMetadata(formData.url);
    setFetching(false);

    if (res.success && res.data) {
      setFormData(prev => ({
        ...prev,
        title: res.data!.title || prev.title,
        description: res.data!.description || prev.description,
        imageUrl: res.data!.image || prev.imageUrl
      }));
      toast.success("Dados preenchidos automaticamente!");
    } else {
      toast.error("Não foi possível buscar dados. Preencha manualmente.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => form.append(key, value || "")); // Garante string

    let res;
    if (initialData) {
        // MODO EDIÇÃO
        res = await updateLink(initialData.id, form);
    } else {
        // MODO CRIAÇÃO
        res = await createLink(form);
    }

    setLoading(false);

    if (res.success) {
      toast.success(res.message);
      onClose();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* URL + Magic Button */}
      <div className="space-y-1.5">
        <Label>URL do Site</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              name="url" 
              placeholder="https://..." 
              className="pl-9" 
              value={formData.url}
              onChange={e => setFormData({...formData, url: e.target.value})}
              required
            />
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleFetchMeta}
            disabled={fetching || !formData.url}
            title="Preencher dados automaticamente"
          >
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4 text-primary" />}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input 
            name="title" 
            placeholder="Ex: Dribbble" 
            value={formData.title}
            onChange={e => setFormData({...formData, title: e.target.value})}
            required 
          />
        </div>
        
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Input 
            name="category" 
            placeholder="Ex: Design" 
            value={formData.category}
            onChange={e => setFormData({...formData, category: e.target.value})}
            list="categories-list"
          />
          <datalist id="categories-list">
            {SUGGESTED_CATEGORIES.map(cat => (
                <option key={cat} value={cat} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea 
          name="description" 
          placeholder="Para que serve este link?" 
          rows={2}
          value={formData.description}
          onChange={e => setFormData({...formData, description: e.target.value})}
        />
      </div>

      <div className="space-y-1.5">
        <Label>URL da Imagem (Capa)</Label>
        <Input 
          name="imageUrl" 
          placeholder="https://..." 
          value={formData.imageUrl}
          onChange={e => setFormData({...formData, imageUrl: e.target.value})}
        />
        {formData.imageUrl && (
            <div className="mt-2 h-24 w-full rounded-md overflow-hidden bg-muted relative border">
                <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => (e.currentTarget.style.display = 'none')} // Esconde se a img quebrar
                />
            </div>
        )}
      </div>

      <DialogFooter className="pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {initialData ? "Salvar Alterações" : "Criar Link"}
        </Button>
      </DialogFooter>
    </form>
  );
}