"use client";

import { useState } from "react";
import { 
  Search, Instagram, Linkedin, Phone, MapPin, 
  Briefcase, Cake, Heart, Star, Users as UsersIcon, Link as LinkIcon,
  Copy, Gift, MoreVertical, Pencil, Trash2, X
} from "lucide-react";
import { format, parseISO, differenceInYears, differenceInDays, setYear, addYears, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

import { cn } from "@/lib/utils";
import { deleteFriend } from "@/app/(dashboard)/social/actions";
import { FriendFormDialog, FriendData } from "./add-friend-dialog";

// --- Helpers de Data e Visual ---
const getProximityBadge = (level?: string) => {
  switch(level) {
    case "FAMILY": 
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 gap-1"><Heart className="w-3 h-3 fill-purple-700" /> Família</Badge>;
    case "CLOSE": 
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 gap-1"><Star className="w-3 h-3 fill-amber-700" /> Próximo</Badge>;
    case "WORK": 
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 gap-1"><Briefcase className="w-3 h-3" /> Trabalho</Badge>;
    default: 
      return <Badge variant="outline" className="text-zinc-500 bg-zinc-50 border-zinc-200 gap-1"><UsersIcon className="w-3 h-3" /> Conhecido</Badge>;
  }
};

const calculateAge = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  return differenceInYears(new Date(), parseISO(dateString));
};

const getDaysUntilBirthday = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = parseISO(dateString);
    let nextBirthday = setYear(birthDate, today.getFullYear());
    
    if (isPast(nextBirthday) && differenceInDays(today, nextBirthday) > 0) {
        nextBirthday = addYears(nextBirthday, 1);
    }
    
    const diff = differenceInDays(nextBirthday, today);
    if (diff === 0) return "Hoje! 🎂";
    return `Faltam ${diff} dias`;
};

// --- Componente Principal ---
export function FriendList({ initialData }: { initialData: FriendData[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [editingFriend, setEditingFriend] = useState<FriendData | null>(null);

  // Lógica de Filtro
  const filteredFriends = initialData.filter(friend => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
        (friend.name?.toLowerCase() || "").includes(searchLower) || 
        (friend.nickname?.toLowerCase() || "").includes(searchLower) ||
        (friend.company?.toLowerCase() || "").includes(searchLower);
    
    const matchesType = filter === "ALL" ? true : friend.proximity === filter;
    return matchesSearch && matchesType;
  });

  // Ações
  const handleDelete = async (id: string) => {
      const res = await deleteFriend(id); 
      if (res.success) toast.success("Contato removido.");
      else toast.error("Erro ao remover.");
  };

  const copyToClipboard = (text: string | null | undefined, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
  };

  return (
    <div className="space-y-8">
      
      {/* --- BARRA DE BUSCA E FILTROS --- */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-1 rounded-2xl border border-border/40 shadow-sm">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nome, apelido ou empresa..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-xl">
            {[
                { key: "ALL", label: "Todos" },
                { key: "CLOSE", label: "Próximos" },
                { key: "WORK", label: "Trabalho" },
                { key: "FAMILY", label: "Família" }
            ].map((f) => (
                <Button 
                    key={f.key}
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setFilter(f.key)}
                    className={cn(
                        "rounded-lg px-4 font-medium transition-all",
                        filter === f.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {f.label}
                </Button>
            ))}
        </div>
      </div>

      {/* --- GRID DE AMIGOS --- */}
      {filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-2xl bg-card/50">
              <div className="p-4 bg-muted rounded-full mb-3">
                <UsersIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Nenhum contato encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-xs mt-1">
                Tente ajustar sua busca ou adicione uma nova conexão.
              </p>
          </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredFriends.map(friend => {
                const age = calculateAge(friend.birthday);
                const daysUntil = getDaysUntilBirthday(friend.birthday);
                const initials = friend.name ? friend.name.substring(0, 2).toUpperCase() : "??";

                return (
                    <Dialog key={friend.id}>
                        <DialogTrigger asChild>
                            <Card className="group cursor-pointer hover:shadow-lg transition-all border-border/60 hover:border-primary/30 bg-card overflow-hidden relative">
                                {/* Faixa de Cor por Proximidade */}
                                <div className={cn("absolute top-0 left-0 w-full h-1.5", 
                                    friend.proximity === "FAMILY" ? "bg-purple-500" : 
                                    friend.proximity === "CLOSE" ? "bg-amber-500" : 
                                    friend.proximity === "WORK" ? "bg-blue-500" : "bg-zinc-300"
                                )}></div>

                                <CardContent className="p-6 pt-8">
                                    <div className="flex justify-between items-start mb-5">
                                        <Avatar className="h-16 w-16 border-4 border-background shadow-md">
                                            <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {getProximityBadge(friend.proximity)}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg text-foreground leading-tight truncate pr-2">{friend.name}</h3>
                                        {friend.nickname && (
                                            <p className="text-sm text-primary font-medium">&quot;{friend.nickname}&quot;</p>
                                        )}
                                        
                                        {(friend.jobTitle || friend.company) ? (
                                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 truncate">
                                                <Briefcase className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                                                <span className="truncate">
                                                    {friend.jobTitle} {friend.jobTitle && friend.company && "•"} <span className="font-medium text-foreground">{friend.company}</span>
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground/50 mt-3 italic">Sem info profissional</p>
                                        )}
                                    </div>

                                    {/* Ações Rápidas (Hover) */}
                                    <div className="mt-6 pt-4 border-t border-dashed border-border flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                                        {friend.phone && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" onClick={(e) => {
                                                e.stopPropagation();
                                                if(friend.phone) window.open(`https://wa.me/${friend.phone.replace(/\D/g, '')}`, '_blank');
                                            }}>
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {friend.instagram && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-lg" onClick={(e) => {
                                                e.stopPropagation();
                                                if(friend.instagram) window.open(`https://instagram.com/${friend.instagram.replace('@', '')}`, '_blank');
                                            }}>
                                                <Instagram className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {friend.linkedin && (
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg" onClick={(e) => {
                                                e.stopPropagation();
                                                if(friend.linkedin) window.open(friend.linkedin, '_blank');
                                            }}>
                                                <Linkedin className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </DialogTrigger>
                        
                        {/* --- DETALHES DO AMIGO --- */}
                        <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border shadow-2xl rounded-3xl">
                            
                            {/* ✅ CORREÇÃO: Header Oculto para Acessibilidade */}
                            <DialogHeader className="sr-only">
                                <DialogTitle>Perfil de {friend.name}</DialogTitle>
                                <DialogDescription>Detalhes e informações de contato.</DialogDescription>
                            </DialogHeader>

                            <div className="relative">
                                {/* Botão de Fechar Custom (Visual) */}
                                <DialogTrigger asChild>
                                    <button className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm">
                                        <X className="h-4 w-4" />
                                    </button>
                                </DialogTrigger>

                                {/* Cover com Gradiente */}
                                <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-background p-8 pt-12 pb-16 relative text-center">
                                    
                                    {/* Menu de Ações (CRUD) */}
                                    <div className="absolute top-4 left-4 z-20">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/40 hover:bg-white/60 text-foreground backdrop-blur-md">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-48">
                                                <DropdownMenuItem onClick={() => setEditingFriend(friend)}>
                                                    <Pencil className="h-4 w-4 mr-2" /> Editar Perfil
                                                </DropdownMenuItem>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                                                            <Trash2 className="h-4 w-4 mr-2" /> Excluir Contato
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Excluir {friend.name}?</AlertDialogTitle>
                                                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => friend.id && handleDelete(friend.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Confirmar</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <Avatar className="h-32 w-32 border-4 border-background shadow-2xl mx-auto mb-4">
                                        <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                                        <AvatarFallback className="bg-background text-foreground font-black text-4xl">{initials}</AvatarFallback>
                                    </Avatar>
                                    
                                    <h2 className="text-2xl font-bold text-foreground leading-tight">{friend.name}</h2>
                                    {friend.nickname && <p className="text-primary font-medium text-lg mt-1">&quot;{friend.nickname}&quot;</p>}
                                    <div className="flex justify-center mt-3">{getProximityBadge(friend.proximity)}</div>
                                </div>

                                {/* Info Grid */}
                                <div className="p-6 space-y-6 -mt-8 bg-background rounded-t-3xl relative z-10">
                                    
                                    {/* Datas & Presentes */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Aniversário</p>
                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                <Cake className="h-4 w-4 text-pink-500" />
                                                {friend.birthday ? `${format(parseISO(friend.birthday), "dd/MM")} (${age})` : "-"}
                                            </div>
                                            {daysUntil && <Badge variant="secondary" className="mt-2 text-[10px] bg-pink-100 text-pink-700 hover:bg-pink-200">{daysUntil}</Badge>}
                                        </div>
                                        <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Presente</p>
                                            <div className="flex items-start gap-2 text-sm text-foreground">
                                                <Gift className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                                <span className="italic leading-tight text-xs text-muted-foreground">{friend.giftIdeas || "Sem ideias"}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pix */}
                                    {friend.pixKey && (
                                        <div onClick={() => copyToClipboard(friend.pixKey, "Pix")} className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-200 dark:bg-emerald-900 rounded-full text-emerald-800 dark:text-emerald-300"><LinkIcon className="h-4 w-4" /></div>
                                                <div>
                                                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase">Chave Pix</p>
                                                    <p className="text-sm font-mono font-bold text-emerald-900 dark:text-emerald-100 truncate max-w-[200px]">{friend.pixKey}</p>
                                                </div>
                                            </div>
                                            <Copy className="h-4 w-4 text-emerald-600 dark:text-emerald-400 opacity-50 group-hover:opacity-100" />
                                        </div>
                                    )}

                                    {/* Notas */}
                                    <div className="space-y-2">
                                        <p className="text-xs text-muted-foreground font-bold uppercase flex items-center gap-2"><MapPin className="h-3 w-3" /> Notas & Local</p>
                                        <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-2xl text-sm text-foreground italic leading-relaxed min-h-[80px]">
                                            {friend.notes ? `"${friend.notes}"` : "Nenhuma nota adicionada."}
                                            {friend.address && <div className="mt-2 pt-2 border-t border-yellow-200/50 not-italic text-xs text-muted-foreground flex gap-1"><MapPin className="h-3 w-3"/> {friend.address}</div>}
                                        </div>
                                    </div>

                                    {/* Call to Action */}
                                    {friend.phone && (
                                        <Button className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 rounded-xl" onClick={() => { if(friend.phone) window.open(`https://wa.me/${friend.phone.replace(/\D/g, '')}`, '_blank'); }}>
                                            <Phone className="h-5 w-5 mr-2" /> Iniciar Conversa
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            })}
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      <FriendFormDialog 
          mode="edit"
          open={!!editingFriend}
          onOpenChange={(open) => !open && setEditingFriend(null)}
          initialData={editingFriend || undefined}
      />
    </div>
  );
}