"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Briefcase, Heart, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { createFriend, updateFriend } from "@/app/(dashboard)/social/actions";
import { Badge } from "@/components/ui/badge";

export interface FriendData {
  id?: string;
  name: string;
  nickname?: string | null;
  proximity: string;
  email?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  birthday?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  pixKey?: string | null;
  address?: string | null;
  notes?: string | null;
  giftIdeas?: string | null;
  tags?: string | null; // 🟢 Novo campo adicionado
}

interface FriendFormProps {
  mode: "create" | "edit";
  initialData?: FriendData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function FriendFormDialog({ mode, initialData, open: controlledOpen, onOpenChange }: FriendFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // Carrega as tags se estiver editando
  useEffect(() => {
    if (initialData?.tags && mode === 'edit') {
      setTags(initialData.tags.split(",").map(t => t.trim()).filter(Boolean));
    } else {
      setTags([]);
    }
  }, [initialData, mode, open]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    
    // Injeta as tags no formulário antes de enviar
    formData.append("tags", tags.join(", "));
    
    if (mode === "edit" && initialData?.id) {
      formData.append("id", initialData.id);
    }

    try {
      const action = mode === "create" ? createFriend : updateFriend;
      const result = await action(formData);
      
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" && (
        <Button onClick={() => setOpen(true)} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4" /> Novo Contato
        </Button>
      )}
      
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border/60">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10">
          <DialogTitle className="text-xl">
            {mode === "create" ? "Adicionar Nova Conexão" : "Editar Perfil"}
          </DialogTitle>
          <DialogDescription>
            Salve as informações importantes para nunca perder o contexto dessa amizade ou parceiro de negócios.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <Tabs defaultValue="perfil" className="w-full">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                <TabsTrigger value="perfil" className="gap-2"><User className="h-4 w-4"/> Perfil</TabsTrigger>
                <TabsTrigger value="contato" className="gap-2"><Briefcase className="h-4 w-4"/> Profissional</TabsTrigger>
                <TabsTrigger value="contexto" className="gap-2"><Heart className="h-4 w-4"/> Contexto</TabsTrigger>
              </TabsList>
            </div>

            {/* --- ABA 1: PERFIL ESSENCIAL --- */}
            <TabsContent value="perfil" className="p-6 space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" name="name" defaultValue={initialData?.name} required placeholder="Ex: João Silva" />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="nickname">Apelido (Como você o chama)</Label>
                  <Input id="nickname" name="nickname" defaultValue={initialData?.nickname || ""} placeholder="Ex: Jão" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="proximity">Círculo de Proximidade</Label>
                  <Select name="proximity" defaultValue={initialData?.proximity || "CASUAL"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FAMILY">Família</SelectItem>
                      <SelectItem value="CLOSE">Amigo Próximo</SelectItem>
                      <SelectItem value="WORK">Trabalho / Negócios</SelectItem>
                      <SelectItem value="CASUAL">Conhecido / Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label htmlFor="imageUrl">Foto (URL da imagem)</Label>
                  <Input id="imageUrl" name="imageUrl" defaultValue={initialData?.imageUrl || ""} placeholder="https://..." />
                </div>
              </div>
            </TabsContent>

            {/* --- ABA 2: CONTATO E PROFISSIONAL --- */}
            <TabsContent value="contato" className="p-6 space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp / Telefone</Label>
                  <Input id="phone" name="phone" defaultValue={initialData?.phone || ""} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" name="instagram" defaultValue={initialData?.instagram || ""} placeholder="@usuario" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Cargo / Ocupação</Label>
                  <Input id="jobTitle" name="jobTitle" defaultValue={initialData?.jobTitle || ""} placeholder="Ex: Desenvolvedor Front-end" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Empresa / Instituição</Label>
                  <Input id="company" name="company" defaultValue={initialData?.company || ""} placeholder="Ex: Google, UNIVÁS..." />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn URL</Label>
                <Input id="linkedin" name="linkedin" defaultValue={initialData?.linkedin || ""} placeholder="https://linkedin.com/in/..." />
              </div>
            </TabsContent>

            {/* --- ABA 3: CONTEXTO, TAGS E NOTAS --- */}
            <TabsContent value="contexto" className="p-6 space-y-4 focus-visible:outline-none focus-visible:ring-0">
              
              {/* O NOVO SISTEMA DE TAGS */}
              <div className="space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                <Label>Tags & Contexto (Onde se conheceram, Interesses)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    placeholder="Ex: Cliente, League of Legends, Faculdade..."
                    className="bg-background"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag}>Adicionar</Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {tags.map(tag => (
                      <Badge key={tag} className="gap-1 pr-1.5 py-1 bg-primary text-primary-foreground hover:bg-primary/90">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="rounded-full hover:bg-background/20 p-0.5 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Pressione Enter para adicionar a Tag.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Data de Aniversário</Label>
                  {/* Se o banco for data, o input type date formata o value nativo */}
                  <Input id="birthday" name="birthday" type="date" defaultValue={initialData?.birthday ? initialData.birthday.split('T')[0] : ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pixKey">Chave Pix (Para rachar contas)</Label>
                  <Input id="pixKey" name="pixKey" defaultValue={initialData?.pixKey || ""} placeholder="CPF, Email, Telefone..." />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anotações e Histórico</Label>
                <Textarea 
                  id="notes" 
                  name="notes" 
                  defaultValue={initialData?.notes || ""} 
                  placeholder="Escreva detalhes úteis: como vocês se conheceram, gostos pessoais, alergias a comidas..."
                  className="resize-none h-20"
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-muted/10">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Perfil"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}