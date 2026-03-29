"use client";

import { useState, useMemo } from "react";
import { 
  Search, Instagram, Linkedin, MapPin, 
  Briefcase, Cake, Heart, Star, Users as UsersIcon, Link as LinkIcon,
  Copy, Gift, MoreVertical, Pencil, Trash2, X, MessageCircle, Hash
} from "lucide-react";
import { format, parseISO, differenceInYears, differenceInDays, setYear, addYears, isPast, isValid } from "date-fns";
import { toast } from "sonner";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

import { cn } from "@/lib/utils";
import { deleteFriend } from "@/app/(dashboard)/social/actions";
import { FriendFormDialog, FriendData } from "./add-friend-dialog";

// --- HELPERS FUNCIONAIS E SEGUROS ---
const getProximityBadge = (level?: string) => {
  switch(level) {
    case "FAMILY": return <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-none gap-1"><Heart className="w-3 h-3 fill-purple-600" /> Família</Badge>;
    case "CLOSE": return <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-none gap-1"><Star className="w-3 h-3 fill-amber-600" /> Próximo</Badge>;
    case "WORK": return <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 border-none gap-1"><Briefcase className="w-3 h-3" /> Trabalho</Badge>;
    default: return <Badge variant="secondary" className="bg-muted text-muted-foreground border-none gap-1"><UsersIcon className="w-3 h-3" /> Conhecido</Badge>;
  }
};

const safelyParseDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
};

const calculateAge = (dateString: string | null | undefined) => {
  const date = safelyParseDate(dateString);
  if (!date) return null;
  return differenceInYears(new Date(), date);
};

const getBirthdayInfo = (dateString: string | null | undefined) => {
    const birthDate = safelyParseDate(dateString);
    if (!birthDate) return { text: null, days: 999, isSoon: false };
    
    const today = new Date();
    let nextBirthday = setYear(birthDate, today.getFullYear());
    
    if (isPast(nextBirthday) && differenceInDays(today, nextBirthday) > 0) {
        nextBirthday = addYears(nextBirthday, 1);
    }
    
    const diff = differenceInDays(nextBirthday, today);
    if (diff === 0) return { text: "É Hoje! 🎉", days: 0, isSoon: true };
    if (diff === 1) return { text: "Amanhã! 🎂", days: 1, isSoon: true };
    
    return { text: `Em ${diff} dias`, days: diff, isSoon: diff <= 30 };
};

const openWhatsApp = (phone?: string | null) => {
    if (!phone) return;
    let numbers = phone.replace(/\D/g, '');
    if (numbers.length === 10 || numbers.length === 11) numbers = `55${numbers}`;
    window.open(`https://wa.me/${numbers}`, '_blank');
};

// --- COMPONENTE PRINCIPAL ---
export function FriendList({ initialData }: { initialData: FriendData[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  
  // Controle de Modais Centralizado
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [editingFriend, setEditingFriend] = useState<FriendData | null>(null);
  const [friendToDelete, setFriendToDelete] = useState<{id: string, name: string} | null>(null);

  // Inteligência de Filtro e Ordenação
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
        
        // Joga aniversariantes do mês pro topo
        if (bdA <= 30 || bdB <= 30) return bdA - bdB;
        return (a.name || "").localeCompare(b.name || "");
    });
  }, [initialData, search, filter]);

  // Ações
  const handleDelete = async () => {
      if (!friendToDelete) return;
      const res = await deleteFriend(friendToDelete.id); 
      if (res.success) {
          toast.success("Contato removido com sucesso.");
          if (selectedFriend?.id === friendToDelete.id) setSelectedFriend(null);
      } else {
          toast.error("Erro ao remover contato.");
      }
      setFriendToDelete(null);
  };

  const copyToClipboard = (text: string | null | undefined, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      toast.success(`${label} copiada!`);
  };

  return (
    <div className="space-y-8">
      
      {/* --- BARRA DE BUSCA E FILTROS --- */}
      <div className="flex flex-col xl:flex-row gap-4 bg-card p-2 rounded-2xl border border-border/40 shadow-sm items-start xl:items-center">
        <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
                placeholder="Buscar por nome, empresa ou tag (Ex: Cliente, LoL)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-10 h-11 border-0 bg-transparent shadow-none focus-visible:ring-0 text-base md:text-sm"
            />
            {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted">
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
        
        <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-xl overflow-x-auto w-full xl:w-auto scrollbar-hide">
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
                        "rounded-lg px-4 font-medium transition-all whitespace-nowrap h-9",
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
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border/60 rounded-[2rem] bg-muted/10 shadow-sm">
              <div className="p-4 bg-background border border-border/40 rounded-full mb-4 shadow-sm">
                <UsersIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Nenhum contato encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Ajuste os filtros ou adicione uma nova conexão ao seu ecossistema.
              </p>
          </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            <TooltipProvider delayDuration={300}>
                {filteredAndSortedFriends.map(friend => {
                    const bdayInfo = getBirthdayInfo(friend.birthday);
                    const initials = friend.name ? friend.name.substring(0, 2).toUpperCase() : "??";
                    const tagList = friend.tags ? friend.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

                    // Cores da faixa de topo
                    const barColor = 
                        friend.proximity === "FAMILY" ? "bg-purple-500" : 
                        friend.proximity === "CLOSE" ? "bg-amber-500" : 
                        friend.proximity === "WORK" ? "bg-blue-500" : "bg-zinc-300";

                    return (
                        <Card 
                            key={friend.id} 
                            onClick={() => setSelectedFriend(friend)}
                            className="group flex flex-col h-full bg-card rounded-2xl border-border/40 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden relative"
                        >
                            {/* Faixa de Cor Topo */}
                            <div className={cn("absolute top-0 left-0 w-full h-1", barColor)} />

                            <CardContent className="p-5 pt-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <Avatar className="h-12 w-12 border border-border/50 shadow-sm group-hover:scale-105 transition-transform duration-300">
                                        <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                                        <AvatarFallback className="bg-muted text-muted-foreground font-bold text-xs">{initials}</AvatarFallback>
                                    </Avatar>
                                    
                                    {/* Botão de Opções - StopPropagation para não abrir o modal */}
                                    <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:bg-muted -mr-2 -mt-2">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-xl">
                                                <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => setEditingFriend(friend)}>
                                                    <Pencil className="h-3.5 w-3.5 mr-2" /> Editar Perfil
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 text-xs font-medium cursor-pointer" onClick={() => setFriendToDelete({ id: friend.id!, name: friend.name })}>
                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Contato
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                
                                <div className="flex-1">
                                    <h3 className="font-bold text-base text-foreground leading-tight truncate pr-2">{friend.name}</h3>
                                    {friend.nickname && <p className="text-xs text-primary font-medium mt-0.5 truncate">&quot;{friend.nickname}&quot;</p>}
                                    
                                    {(friend.jobTitle || friend.company) && (
                                        <p className="text-[11px] text-muted-foreground mt-2.5 flex items-center gap-1.5 truncate">
                                            <Briefcase className="h-3 w-3 shrink-0 opacity-60" />
                                            <span className="truncate">
                                                {friend.jobTitle} {friend.jobTitle && friend.company && "•"} <span className="font-semibold text-foreground/80">{friend.company}</span>
                                            </span>
                                        </p>
                                    )}

                                    {/* ALERTA DE ANIVERSÁRIO */}
                                    {bdayInfo.isSoon && (
                                        <div className="mt-3">
                                            <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-none px-2 py-0.5 gap-1.5 text-[10px] font-bold shadow-none">
                                                <Cake className="w-3 h-3 fill-pink-500/20" /> {bdayInfo.text}
                                            </Badge>
                                        </div>
                                    )}

                                    {/* TAGS */}
                                    {tagList.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-4">
                                            {tagList.slice(0, 3).map((tag, idx) => (
                                                <Badge key={idx} variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 text-muted-foreground font-semibold bg-muted/20">
                                                    {tag}
                                                </Badge>
                                            ))}
                                            {tagList.length > 3 && (
                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-border/60 text-muted-foreground font-semibold bg-muted/20">
                                                    +{tagList.length - 3}
                                                </Badge>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>

                            {/* Rodapé: Ações Rápidas - StopPropagation para não abrir o modal */}
                            <CardFooter className="p-2 border-t border-border/40 bg-muted/5 flex gap-1 justify-center relative z-20" onClick={(e) => e.stopPropagation()}>
                                {friend.phone ? (
                                    <Button size="sm" variant="ghost" className="h-8 flex-1 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 text-xs font-bold" onClick={() => openWhatsApp(friend.phone)}>
                                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> WhatsApp
                                    </Button>
                                ) : (
                                    <span className="text-[10px] text-muted-foreground/60 italic my-auto px-2 w-full text-center">Sem telefone</span>
                                )}

                                {friend.instagram && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-pink-600 hover:bg-pink-500/10" onClick={() => window.open(`https://instagram.com/${friend.instagram?.replace('@', '')}`, '_blank')}>
                                                <Instagram className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Abrir Instagram</TooltipContent>
                                    </Tooltip>
                                )}
                                {friend.linkedin && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:bg-blue-500/10" onClick={() => window.open(friend.linkedin || '', '_blank')}>
                                                <Linkedin className="h-3.5 w-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Abrir LinkedIn</TooltipContent>
                                    </Tooltip>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </TooltipProvider>
        </div>
      )}

      {/* --- O ÚNICO MODAL DE DETALHES --- */}
      <Dialog open={!!selectedFriend} onOpenChange={(open) => !open && setSelectedFriend(null)}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-[2rem]">
            {selectedFriend && (() => {
                const age = calculateAge(selectedFriend.birthday);
                const bdayInfo = getBirthdayInfo(selectedFriend.birthday);
                const initials = selectedFriend.name ? selectedFriend.name.substring(0, 2).toUpperCase() : "??";
                const tagList = selectedFriend.tags ? selectedFriend.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

                return (
                    <>
                        <DialogHeader className="sr-only">
                            <DialogTitle>Perfil de {selectedFriend.name}</DialogTitle>
                            <DialogDescription>Detalhes e contexto do contato.</DialogDescription>
                        </DialogHeader>

                        {/* Topo: Avatar e Nome */}
                        <div className="bg-muted/10 p-8 pt-10 border-b border-border/40 flex flex-col items-center text-center relative">
                            <Avatar className="h-28 w-28 border-4 border-background shadow-xl mb-4">
                                <AvatarImage src={selectedFriend.imageUrl || undefined} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 text-primary font-black text-3xl">{initials}</AvatarFallback>
                            </Avatar>
                            
                            <h2 className="text-2xl font-bold text-foreground leading-tight">{selectedFriend.name}</h2>
                            {selectedFriend.nickname && <p className="text-primary font-medium text-sm mt-1">&quot;{selectedFriend.nickname}&quot;</p>}
                            <div className="mt-3">{getProximityBadge(selectedFriend.proximity)}</div>
                        </div>

                        {/* Corpo: Informações */}
                        <ScrollArea className="max-h-[50vh]">
                            <div className="p-6 md:p-8 space-y-6">
                                
                                {/* Tags */}
                                {tagList.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1.5"><Hash className="h-3 w-3" /> Contexto & Tags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {tagList.map((tag, idx) => (
                                                <Badge key={idx} variant="secondary" className="px-2.5 py-1 bg-primary/5 text-primary border-primary/10 font-semibold">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1.5"><Cake className="h-3 w-3 text-pink-500" /> Aniversário</p>
                                        <p className="text-sm font-semibold text-foreground">
                                            {selectedFriend.birthday ? `${format(safelyParseDate(selectedFriend.birthday)!, "dd/MM")} (${age} anos)` : "Não informado"}
                                        </p>
                                        {bdayInfo.text && <Badge variant="secondary" className="mt-2 text-[10px] bg-pink-500/10 text-pink-600 border-none">{bdayInfo.text}</Badge>}
                                    </div>
                                    <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1.5"><Gift className="h-3 w-3 text-purple-500" /> Ideias de Presente</p>
                                        <p className="text-sm text-foreground/80 leading-snug">
                                            {selectedFriend.giftIdeas || <span className="italic opacity-60">Sem ideias registradas.</span>}
                                        </p>
                                    </div>
                                </div>

                                {selectedFriend.pixKey && (
                                    <div onClick={() => copyToClipboard(selectedFriend.pixKey, "Chave Pix")} className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600"><LinkIcon className="h-4 w-4" /></div>
                                            <div>
                                                <p className="text-[10px] text-emerald-600/80 font-bold uppercase">Chave Pix</p>
                                                <p className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-500 truncate max-w-[200px]">{selectedFriend.pixKey}</p>
                                            </div>
                                        </div>
                                        <Copy className="h-4 w-4 text-emerald-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Anotações & Endereço</p>
                                    <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl text-sm text-foreground/90 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                                        {selectedFriend.notes ? selectedFriend.notes : <span className="italic opacity-60">Nenhuma anotação extra. Pense em como vocês se conheceram ou gostos dessa pessoa!</span>}
                                        {selectedFriend.address && <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground flex gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 opacity-60"/> {selectedFriend.address}</div>}
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                    </>
                );
            })()}
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE EDIÇÃO --- */}
      <FriendFormDialog 
          mode="edit"
          open={!!editingFriend}
          onOpenChange={(open) => !open && setEditingFriend(null)}
          initialData={editingFriend || undefined}
      />

      {/* --- MODAL DE EXCLUSÃO --- */}
      <AlertDialog open={!!friendToDelete} onOpenChange={(o) => !o && setFriendToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
                <AlertDialogTitle>Excluir {friendToDelete?.name}?</AlertDialogTitle>
                <AlertDialogDescription>Tem certeza? Esta ação apagará todos os dados deste contato permanentemente.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl">
                    Sim, excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}