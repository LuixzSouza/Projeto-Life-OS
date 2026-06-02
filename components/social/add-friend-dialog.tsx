"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Briefcase, Heart, X, Plus, Tags, Camera, Upload, Trash2, Link as LinkIcon, Gift, MapPin } from "lucide-react";
import { toast } from "sonner";
import { createFriend, updateFriend } from "@/app/(dashboard)/social/actions";
import { compressImageFile } from "@/lib/image";
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
  tags?: string | null;
  // Clientes (Negócios) vinculados a esta conexão (somente leitura).
  clients?: { id: string; name: string; company?: string | null }[];
}

interface FriendFormProps {
  mode: "create" | "edit";
  initialData?: FriendData;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// Helper seguro para formatar a data que vem do banco
const safelyFormatDate = (dateString?: string | null) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toISOString().split('T')[0];
  } catch {
    return ""; // Se vier lixo do banco, não quebra a tela
  }
};

export function FriendFormDialog({ mode, initialData, open: controlledOpen, onOpenChange }: FriendFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 🟢 ESTADO CONTROLADO BLINDADO CONTRA PERDA DE DADOS NAS ABAS
  const [formData, setFormData] = useState<Partial<FriendData>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Sincroniza os dados iniciais quando o modal abre.
  // Importante: inicializamos TODOS os campos (mesmo os sem input visível,
  // como twitter) para não apagá-los silenciosamente ao salvar uma edição.
  useEffect(() => {
    if (open) {
      setFormData({
        name: initialData?.name || "",
        nickname: initialData?.nickname || "",
        proximity: initialData?.proximity || "CASUAL",
        imageUrl: initialData?.imageUrl || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        instagram: initialData?.instagram || "",
        twitter: initialData?.twitter || "",
        jobTitle: initialData?.jobTitle || "",
        company: initialData?.company || "",
        linkedin: initialData?.linkedin || "",
        birthday: safelyFormatDate(initialData?.birthday),
        pixKey: initialData?.pixKey || "",
        giftIdeas: initialData?.giftIdeas || "",
        address: initialData?.address || "",
        notes: initialData?.notes || "",
      });

      if (initialData?.tags) {
        setTags(initialData.tags.split(",").map(t => t.trim()).filter(Boolean));
      } else {
        setTags([]);
      }
      setTagInput("");
    }
  }, [initialData, open]);

  // Upload de foto: comprime no cliente e guarda como base64 em imageUrl
  // (o mesmo campo aceita URL externa — ambos persistem do mesmo jeito).
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      input.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo de 10MB.");
      input.value = "";
      return;
    }

    try {
      setUploadingImg(true);
      const compressed = await compressImageFile(file, { maxDimension: 400, quality: 0.85 });
      setFormData(prev => ({ ...prev, imageUrl: compressed }));
    } catch {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      setUploadingImg(false);
      input.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof FriendData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Previne que o Enter envie o formulário acidentalmente
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault(); 
    
    const newTag = tagInput.trim();
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Previne o reload padrão da página
    
    if (!formData.name?.trim()) {
        toast.error("O nome é obrigatório.");
        return;
    }

    setIsSubmitting(true);
    
    // Constrói o payload a partir do estado React (ignora as abas escondidas do HTML)
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
        // Só campos de texto vão no payload (ex.: `clients` é só leitura, não é enviado).
        if (typeof value === "string" && value) payload.append(key, value);
    });
    
    payload.append("tags", tags.join(", "));
    
    if (mode === "edit" && initialData?.id) {
      payload.append("id", initialData.id);
    }

    try {
      const action = mode === "create" ? createFriend : updateFriend;
      const result = await action(payload);
      
      if (result.success) {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("Ocorreu um erro inesperado ao salvar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" && (
        <Button onClick={() => setOpen(true)} className="gap-2 font-medium rounded-lg shadow-sm">
          <Plus className="h-4 w-4" /> Novo Contato
        </Button>
      )}
      
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/40 bg-muted/10 text-left">
          <DialogTitle className="text-xl">
            {mode === "create" ? "Adicionar Conexão" : "Editar Perfil"}
          </DialogTitle>
          <DialogDescription className="mt-1">
            Salve informações importantes para manter o contexto das suas relações.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[75vh]">
          <Tabs defaultValue="perfil" className="flex flex-col h-full">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger value="perfil" className="gap-2 rounded-md text-xs font-medium"><User className="h-3.5 w-3.5"/> Perfil</TabsTrigger>
                <TabsTrigger value="contato" className="gap-2 rounded-md text-xs font-medium"><Briefcase className="h-3.5 w-3.5"/> Profissional</TabsTrigger>
                <TabsTrigger value="contexto" className="gap-2 rounded-md text-xs font-medium"><Heart className="h-3.5 w-3.5"/> Contexto</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* --- ABA 1: PERFIL ESSENCIAL --- */}
                <TabsContent value="perfil" className="p-6 space-y-5 m-0 focus-visible:outline-none">

                  {/* Foto: upload (arquivo) ou URL — ambos salvam em imageUrl */}
                  <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start bg-muted/10 border border-border/40 rounded-xl p-4">
                    <div className="flex flex-col items-center gap-2 shrink-0">
                      <div
                        className="relative group/av cursor-pointer"
                        onClick={() => fileRef.current?.click()}
                        title="Enviar foto"
                      >
                        <Avatar className="h-20 w-20 border border-border/50 shadow-sm">
                          <AvatarImage src={formData.imageUrl || undefined} className="object-cover" />
                          <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                            {(formData.name || "?").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/55 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover/av:opacity-100 transition-opacity">
                          {uploadingImg ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] rounded-lg" onClick={() => fileRef.current?.click()} disabled={uploadingImg}>
                          <Upload className="h-3 w-3 mr-1" /> Foto
                        </Button>
                        {formData.imageUrl && (
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setFormData(prev => ({ ...prev, imageUrl: "" }))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <input type="file" ref={fileRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarFile} />
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <Label htmlFor="imageUrl" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <LinkIcon className="h-3 w-3" /> Ou cole uma URL de imagem
                      </Label>
                      <Input id="imageUrl" name="imageUrl" value={formData.imageUrl?.startsWith("data:") ? "" : (formData.imageUrl || "")} onChange={handleChange} placeholder="https://..." className="rounded-lg h-10 bg-background font-mono text-xs" />
                      <p className="text-[10px] text-muted-foreground">
                        {formData.imageUrl?.startsWith("data:") ? "Foto enviada do dispositivo. Cole uma URL para substituir." : "A foto fica salva junto do contato."}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground">Nome Completo <span className="text-rose-500">*</span></Label>
                      <Input id="name" name="name" value={formData.name || ""} onChange={handleChange} required placeholder="Ex: João Silva" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <Label htmlFor="nickname" className="text-xs font-semibold text-muted-foreground">Apelido</Label>
                      <Input id="nickname" name="nickname" value={formData.nickname || ""} onChange={handleChange} placeholder="Ex: Jão" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Círculo de Proximidade</Label>
                    <Select value={formData.proximity} onValueChange={(v) => handleSelectChange("proximity", v)}>
                      <SelectTrigger className="rounded-lg h-10 bg-muted/20">
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="FAMILY">Família</SelectItem>
                        <SelectItem value="CLOSE">Amigo Próximo</SelectItem>
                        <SelectItem value="WORK">Trabalho / Negócios</SelectItem>
                        <SelectItem value="CASUAL">Conhecido / Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                {/* --- ABA 2: CONTATO E PROFISSIONAL --- */}
                <TabsContent value="contato" className="p-6 space-y-5 m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">WhatsApp / Telefone</Label>
                      <Input id="phone" name="phone" value={formData.phone || ""} onChange={handleChange} placeholder="(00) 00000-0000" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email</Label>
                      <Input id="email" name="email" type="email" value={formData.email || ""} onChange={handleChange} placeholder="contato@email.com" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle" className="text-xs font-semibold text-muted-foreground">Cargo / Ocupação</Label>
                      <Input id="jobTitle" name="jobTitle" value={formData.jobTitle || ""} onChange={handleChange} placeholder="Ex: Engenheiro de Software" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company" className="text-xs font-semibold text-muted-foreground">Empresa</Label>
                      <Input id="company" name="company" value={formData.company || ""} onChange={handleChange} placeholder="Ex: Google" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="text-xs font-semibold text-muted-foreground">Instagram</Label>
                      <Input id="instagram" name="instagram" value={formData.instagram || ""} onChange={handleChange} placeholder="@usuario" className="rounded-lg h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="text-xs font-semibold text-muted-foreground">LinkedIn (URL)</Label>
                      <Input id="linkedin" name="linkedin" value={formData.linkedin || ""} onChange={handleChange} placeholder="https://linkedin.com/in/..." className="rounded-lg h-10 bg-muted/20 font-mono text-xs" />
                    </div>
                  </div>
                </TabsContent>

                {/* --- ABA 3: CONTEXTO E ANOTAÇÕES --- */}
                <TabsContent value="contexto" className="p-6 space-y-5 m-0 focus-visible:outline-none">
                  
                  <div className="space-y-3 bg-muted/10 p-5 rounded-xl border border-border/40">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <Tags className="h-3.5 w-3.5 text-primary" /> Tags & Classificações
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleAddTag}
                        placeholder="Ex: Cliente, Faculdade, Futebol..."
                        className="bg-background rounded-lg h-9 text-sm"
                      />
                      <Button type="button" variant="secondary" onClick={handleAddTag} className="h-9 px-4 rounded-lg">Adicionar</Button>
                    </div>
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="gap-1 pr-1.5 py-1 bg-background border-border/60 hover:bg-muted font-medium">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="rounded-full hover:bg-destructive/10 hover:text-destructive p-0.5 transition-colors">
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                        <p className="text-[11px] text-muted-foreground">Aperte <kbd className="px-1.5 py-0.5 bg-background border rounded mx-1">Enter</kbd> para adicionar uma tag.</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birthday" className="text-xs font-semibold text-muted-foreground">Data de Aniversário</Label>
                      <Input id="birthday" name="birthday" type="date" value={formData.birthday || ""} onChange={handleChange} className="rounded-lg h-10 bg-muted/20" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pixKey" className="text-xs font-semibold text-muted-foreground">Chave Pix</Label>
                      <Input id="pixKey" name="pixKey" value={formData.pixKey || ""} onChange={handleChange} placeholder="CPF, Email, Celular..." className="rounded-lg h-10 bg-muted/20" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="giftIdeas" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Gift className="h-3.5 w-3.5 text-purple-500" /> Ideias de Presente
                    </Label>
                    <Input id="giftIdeas" name="giftIdeas" value={formData.giftIdeas || ""} onChange={handleChange} placeholder="Ex: Livros de ficção, vinho, fone..." className="rounded-lg h-10 bg-muted/20" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> Endereço
                    </Label>
                    <Input id="address" name="address" value={formData.address || ""} onChange={handleChange} placeholder="Rua, bairro, cidade..." className="rounded-lg h-10 bg-muted/20" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">Anotações e Histórico</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes || ""}
                      onChange={handleChange}
                      placeholder="Como vocês se conheceram? Gostos pessoais, alergias a comidas, etc."
                      className="resize-none h-24 rounded-xl bg-muted/20 p-4 text-sm"
                    />
                  </div>
                </TabsContent>
            </div>

            <DialogFooter className="p-6 border-t border-border/40 bg-muted/5 shrink-0 flex-row justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-lg h-10 px-6">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px] rounded-lg h-10 shadow-sm">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Salvar Perfil
              </Button>
            </DialogFooter>
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}