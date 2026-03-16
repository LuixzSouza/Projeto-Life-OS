"use client";

import { useState, useMemo } from "react";
import { 
  Search, Instagram, Linkedin, Phone, MapPin, 
  Briefcase, Cake, Heart, Star, Users as UsersIcon, Link as LinkIcon,
  Copy, Gift, MoreVertical, Pencil, Trash2, X, MessageCircle, Hash
} from "lucide-react";
import { format, parseISO, differenceInYears, differenceInDays, setYear, addYears, isPast } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";
import { deleteFriend } from "@/app/(dashboard)/social/actions";
import { FriendFormDialog, FriendData } from "./add-friend-dialog";

// --- Helpers Funcionais ---
const getProximityBadge = (level?: string) => {
  switch(level) {
    case "FAMILY": return <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 gap-1"><Heart className="w-3 h-3 fill-purple-700" /> Família</Badge>;
    case "CLOSE": return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200 gap-1"><Star className="w-3 h-3 fill-amber-700" /> Próximo</Badge>;
    case "WORK": return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 gap-1"><Briefcase className="w-3 h-3" /> Trabalho</Badge>;
    default: return <Badge variant="outline" className="text-zinc-500 bg-zinc-50 border-zinc-200 gap-1"><UsersIcon className="w-3 h-3" /> Conhecido</Badge>;
  }
};

const calculateAge = (dateString: string | null | undefined) => {
  if (!dateString) return null;
  return differenceInYears(new Date(), parseISO(dateString));
};

const getBirthdayInfo = (dateString: string | null | undefined) => {
    if (!dateString) return { text: null, days: 999, isSoon: false };
    
    const today = new Date();
    const birthDate = parseISO(dateString);
    let nextBirthday = setYear(birthDate, today.getFullYear());
    
    if (isPast(nextBirthday) && differenceInDays(today, nextBirthday) > 0) {
        nextBirthday = addYears(nextBirthday, 1);
    }
    
    const diff = differenceInDays(nextBirthday, today);
    if (diff === 0) return { text: "É Hoje! 🎉", days: 0, isSoon: true };
    if (diff === 1) return { text: "Amanhã! 🎂", days: 1, isSoon: true };
    
    return { 
        text: `Em ${diff} dias`, 
        days: diff, 
        isSoon: diff <= 30
    };
};

const openWhatsApp = (phone?: string | null) => {
    if (!phone) return;
    let numbers = phone.replace(/\D/g, '');
    if (numbers.length === 10 || numbers.length === 11) {
        numbers = `55${numbers}`;
    }
    window.open(`https://wa.me/${numbers}`, '_blank');
};

// --- Componente Principal ---
export function FriendList({ initialData }: { initialData: FriendData[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [editingFriend, setEditingFriend] = useState<FriendData | null>(null);
  
  const [friendToDelete, setFriendToDelete] = useState<{id: string, name: string} | null>(null);

  const filteredAndSortedFriends = useMemo(() => {
    const result = initialData.filter(friend => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
          (friend.name?.toLowerCase() || "").includes(searchLower) || 
          (friend.nickname?.toLowerCase() || "").includes(searchLower) ||
          (friend.company?.toLowerCase() || "").includes(searchLower) ||
          (friend.tags?.toLowerCase() || "").includes(searchLower);
      
      const matchesType = filter === "ALL" ? true : friend.proximity === filter;
      return matchesSearch && matchesType;
    });

    return result.sort((a, b) => {
        const bdA = getBirthdayInfo(a.birthday).days;
        const bdB = getBirthdayInfo(b.birthday).days;
        
        if (bdA <= 30 || bdB <= 30) {
            return bdA - bdB;
        }
        return (a.name || "").localeCompare(b.name || "");
    });
  }, [initialData, search, filter]);

  const handleDelete = async () => {
      if (!friendToDelete) return;
      const res = await deleteFriend(friendToDelete.id); 
      if (res.success) toast.success("Contato removido com sucesso.");
      else toast.error("Erro ao remover.");
      setFriendToDelete(null);
  };

  const copyToClipboard = (text: string | null | undefined, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      toast.success(`${label} copiada para a área de transferência!`);
  };

  return (
    <div className="space-y-8">
      
      {/* --- BARRA DE BUSCA E FILTROS --- */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-1.5 rounded-2xl border border-border/60 shadow-sm">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nome, empresa ou tag (Ex: LoL, Cliente)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            {search && (
                <button 
                    onClick={() => setSearch("")} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl overflow-x-auto scrollbar-none">
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
                        "rounded-lg px-4 font-medium transition-all whitespace-nowrap",
                        filter === f.key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {f.label}
                </Button>
            ))}
        </div>
      </div>

      {/* --- GRID DE CONEXÕES --- */}
      {filteredAndSortedFriends.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <TooltipProvider delayDuration={300}>
                {filteredAndSortedFriends.map(friend => {
                    const age = calculateAge(friend.birthday);
                    const bdayInfo = getBirthdayInfo(friend.birthday);
                    const initials = friend.name ? friend.name.substring(0, 2).toUpperCase() : "??";
                    
                    const tagList = friend.tags ? friend.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

                    return (
                        <Dialog key={friend.id}>
                            <Card className="group flex flex-col h-full hover:shadow-xl transition-all duration-300 border-border/60 hover:border-primary/40 bg-card relative overflow-hidden">
                                
                                {/* Faixa de Cor Topo */}
                                <div className={cn("absolute top-0 left-0 w-full h-1.5", 
                                    friend.proximity === "FAMILY" ? "bg-purple-500" : 
                                    friend.proximity === "CLOSE" ? "bg-amber-500" : 
                                    friend.proximity === "WORK" ? "bg-blue-500" : "bg-zinc-300"
                                )} />

                                <DialogTrigger asChild>
                                    <CardContent className="p-5 pt-6 flex-1 cursor-pointer flex flex-col relative">
                                        
                                        <div className="flex justify-between items-start mb-4">
                                            <Avatar className="h-14 w-14 border border-muted shadow-sm group-hover:scale-105 transition-transform">
                                                <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                                                <AvatarFallback className="bg-primary/5 text-primary font-bold">{initials}</AvatarFallback>
                                            </Avatar>
                                            
                                            <div className="flex flex-col items-end gap-2">
                                                {getProximityBadge(friend.proximity)}
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg text-foreground leading-tight truncate pr-2">{friend.name}</h3>
                                            {friend.nickname && (
                                                <p className="text-sm text-primary font-medium mt-0.5">&quot;{friend.nickname}&quot;</p>
                                            )}
                                            
                                            {/* 🟢 ALERTA DE ANIVERSÁRIO (Movido para dentro do conteúdo) */}
                                            {bdayInfo.isSoon && (
                                                <div className="mt-3 animate-in fade-in slide-in-from-left-2">
                                                    <Badge className="bg-pink-100 text-pink-700 hover:bg-pink-200 border-pink-200/50 shadow-sm px-2.5 py-1 gap-1.5 text-[10px] font-bold w-fit">
                                                        <Cake className="w-3.5 h-3.5 fill-pink-500/20" />
                                                        {bdayInfo.text}
                                                    </Badge>
                                                </div>
                                            )}

                                            {(friend.jobTitle || friend.company) ? (
                                                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5 truncate">
                                                    <Briefcase className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">
                                                        {friend.jobTitle} {friend.jobTitle && friend.company && "•"} <span className="font-medium text-foreground">{friend.company}</span>
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="text-xs text-muted-foreground/50 mt-3 italic">Sem info profissional</p>
                                            )}

                                            {/* TAGS NO CARD */}
                                            {tagList.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-4">
                                                    {tagList.slice(0, 3).map((tag, idx) => (
                                                        <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary hover:bg-primary/20 border-none font-semibold">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                    {tagList.length > 3 && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground border-none">
                                                            +{tagList.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </DialogTrigger>

                                {/* Rodapé: Ações Rápidas */}
                                <div className="p-2.5 border-t border-border/50 bg-muted/10 flex gap-2 justify-center mt-auto relative z-20">
                                    {friend.phone ? (
                                        <Button size="sm" variant="ghost" className="h-8 flex-1 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => openWhatsApp(friend.phone)}>
                                            <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] text-muted-foreground italic my-auto px-2">Sem WhatsApp</span>
                                    )}

                                    {friend.instagram && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-pink-600 hover:bg-pink-50 hover:text-pink-700" onClick={() => window.open(`https://instagram.com/${friend.instagram?.replace('@', '')}`, '_blank')}>
                                                    <Instagram className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Abrir Instagram</TooltipContent>
                                        </Tooltip>
                                    )}
                                    {friend.linkedin && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => window.open(friend.linkedin || '', '_blank')}>
                                                    <Linkedin className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Abrir LinkedIn</TooltipContent>
                                        </Tooltip>
                                    )}
                                </div>

                                {/* --- MODAL DE DETALHES --- */}
                                <DialogContent className="max-w-md p-0 overflow-hidden bg-background border-border shadow-2xl rounded-3xl">
                                    <DialogHeader className="sr-only">
                                        <DialogTitle>Perfil de {friend.name}</DialogTitle>
                                        <DialogDescription>Detalhes do contato.</DialogDescription>
                                    </DialogHeader>

                                    <div className="relative">
                                        <DialogTrigger asChild>
                                            <button className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors backdrop-blur-sm">
                                                <X className="h-4 w-4" />
                                            </button>
                                        </DialogTrigger>

                                        <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-background p-8 pt-12 pb-16 relative text-center">
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
                                                        <DropdownMenuItem 
                                                            onSelect={(e) => { 
                                                                e.preventDefault(); 
                                                                setFriendToDelete({ id: friend.id!, name: friend.name }); 
                                                            }} 
                                                            className="text-destructive focus:bg-destructive/10"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Excluir Contato
                                                        </DropdownMenuItem>
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

                                        <div className="p-6 space-y-6 -mt-8 bg-background rounded-t-3xl relative z-10">
                                            
                                            {tagList.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1.5"><Hash className="h-3 w-3" /> Contexto & Tags</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {tagList.map((tag, idx) => (
                                                            <Badge key={idx} variant="secondary" className="px-2.5 py-1 bg-primary/10 text-primary border-none">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Aniversário</p>
                                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                                        <Cake className="h-4 w-4 text-pink-500" />
                                                        {friend.birthday ? `${format(parseISO(friend.birthday), "dd/MM")} (${age} anos)` : "-"}
                                                    </div>
                                                    {bdayInfo.text && <Badge variant="secondary" className="mt-2 text-[10px] bg-pink-100 text-pink-700 hover:bg-pink-200">{bdayInfo.text}</Badge>}
                                                </div>
                                                <div className="bg-secondary/30 p-4 rounded-2xl border border-border/50">
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">Presente ideal</p>
                                                    <div className="flex items-start gap-2 text-sm text-foreground">
                                                        <Gift className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                                        <span className="italic leading-tight text-xs text-muted-foreground">{friend.giftIdeas || "Adicione ideias na edição"}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {friend.pixKey && (
                                                <div onClick={() => copyToClipboard(friend.pixKey, "Pix")} className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 cursor-pointer hover:bg-emerald-100 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-emerald-200 dark:bg-emerald-900 rounded-full text-emerald-800"><LinkIcon className="h-4 w-4" /></div>
                                                        <div>
                                                            <p className="text-[10px] text-emerald-700 font-bold uppercase">Chave Pix</p>
                                                            <p className="text-sm font-mono font-bold text-emerald-900 truncate max-w-[200px]">{friend.pixKey}</p>
                                                        </div>
                                                    </div>
                                                    <Copy className="h-4 w-4 text-emerald-600 opacity-50 group-hover:opacity-100" />
                                                </div>
                                            )}

                                            <div className="space-y-2">
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Anotações & Endereço</p>
                                                <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-2xl text-sm text-foreground italic min-h-[80px] whitespace-pre-wrap">
                                                    {friend.notes ? `"${friend.notes}"` : "Nenhuma anotação extra. Pense em como vocês se conheceram ou assuntos que essa pessoa gosta!"}
                                                    {friend.address && <div className="mt-3 pt-3 border-t border-yellow-200/50 not-italic text-xs text-muted-foreground flex gap-1"><MapPin className="h-3 w-3 shrink-0"/> {friend.address}</div>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </DialogContent>
                            </Card>
                        </Dialog>
                    )
                })}
            </TooltipProvider>
        </div>
      )}

      {/* MODAL DE EDIÇÃO */}
      <FriendFormDialog 
          mode="edit"
          open={!!editingFriend}
          onOpenChange={(open) => !open && setEditingFriend(null)}
          initialData={editingFriend || undefined}
      />

      {/* MODAL DE EXCLUSÃO */}
      <AlertDialog open={!!friendToDelete} onOpenChange={(o) => !o && setFriendToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir {friendToDelete?.name}?</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza? Esta ação não poderá ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
                    Sim, excluir contato
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}