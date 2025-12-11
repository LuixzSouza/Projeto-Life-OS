"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, Instagram, Linkedin, Phone, MapPin, 
  Briefcase, Cake, Heart, Star, Users as UsersIcon, Link as LinkIcon,
  Copy, Gift, MoreVertical, Pencil, Trash2
} from "lucide-react";
import { differenceInYears, format, parseISO, differenceInDays, addYears, isPast, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteFriend } from "@/app/(dashboard)/social/actions"; // Server Action
import { FriendFormDialog, FriendData } from "./add-friend-dialog"; // Importe o Dialog criado anteriormente

export function FriendList({ initialData }: { initialData: FriendData[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  
  // Estado para controlar qual amigo está sendo editado
  const [editingFriend, setEditingFriend] = useState<FriendData | null>(null);

  // --- FILTRO ---
  const filteredFriends = initialData.filter(friend => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
        (friend.name?.toLowerCase() || "").includes(searchLower) || 
        (friend.nickname?.toLowerCase() || "").includes(searchLower) ||
        (friend.company?.toLowerCase() || "").includes(searchLower);
    
    const matchesType = filter === "ALL" ? true : friend.proximity === filter;
    return matchesSearch && matchesType;
  });

  // --- ACTIONS ---
  const handleDelete = async (id: string) => {
      const res = await deleteFriend(id); 
      if (res.success) {
          toast.success("Contato removido.");
      } else {
          toast.error("Erro ao remover.");
      }
  };

  const copyToClipboard = (text: string | null | undefined, label: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      toast.success(`${label} copiado!`);
  };

  // --- HELPERS ---
  const getProximityBadge = (level?: string) => {
    switch(level) {
      case "FAMILY": return <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200"><Heart className="w-3 h-3 mr-1 fill-purple-700" /> Família</Badge>;
      case "CLOSE": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200"><Star className="w-3 h-3 mr-1 fill-emerald-700" /> Próximo</Badge>;
      case "WORK": return <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"><Briefcase className="w-3 h-3 mr-1" /> Trabalho</Badge>;
      default: return <Badge variant="outline" className="text-zinc-500 bg-zinc-50 border-zinc-200"><UsersIcon className="w-3 h-3 mr-1" /> Conhecido</Badge>;
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

  return (
    <div className="space-y-6">
      
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input 
                placeholder="Buscar amigo..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
            />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
            {[
                { key: "ALL", label: "Todos" },
                { key: "CLOSE", label: "Próximos" },
                { key: "WORK", label: "Trabalho" },
                { key: "FAMILY", label: "Família" }
            ].map((f) => (
                <Button 
                    key={f.key}
                    variant={filter === f.key ? "default" : "outline"} 
                    size="sm" 
                    onClick={() => setFilter(f.key)}
                    className={cn(
                        "rounded-full px-4 font-medium",
                        filter === f.key ? "bg-zinc-900 text-white" : "text-zinc-600"
                    )}
                >
                    {f.label}
                </Button>
            ))}
        </div>
      </div>

      {/* Grid */}
      {filteredFriends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
              <UsersIcon className="h-10 w-10 text-zinc-300 mb-2" />
              <p className="text-zinc-500 font-medium">Nenhum contato encontrado.</p>
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
                            <Card className="group cursor-pointer hover:shadow-lg transition-all border-zinc-200 hover:border-indigo-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden relative">
                                <div className={cn("absolute top-0 left-0 w-full h-1", 
                                    friend.proximity === "FAMILY" ? "bg-purple-500" : 
                                    friend.proximity === "CLOSE" ? "bg-emerald-500" : 
                                    friend.proximity === "WORK" ? "bg-blue-500" : "bg-zinc-300"
                                )}></div>

                                <CardContent className="p-5 pt-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <Avatar className="h-16 w-16 border-4 border-white dark:border-zinc-950 shadow-sm bg-zinc-100">
                                            <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-white text-indigo-700 font-bold text-xl">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        {getProximityBadge(friend.proximity)}
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 leading-tight truncate">{friend.name}</h3>
                                        {friend.nickname && (
                                            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">&quot;{friend.nickname}&quot;</p>
                                        )}
                                        
                                        {(friend.jobTitle || friend.company) ? (
                                            <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5 truncate">
                                                <Briefcase className="h-3 w-3 shrink-0" />
                                                <span className="truncate">
                                                    {friend.jobTitle} {friend.jobTitle && friend.company && "na"} <span className="font-semibold text-zinc-700 dark:text-zinc-300">{friend.company}</span>
                                                </span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-zinc-400 mt-2 italic">Sem info profissional</p>
                                        )}
                                    </div>

                                    {/* Botões Rápidos */}
                                    <div className="mt-5 pt-4 border-t border-dashed border-zinc-100 dark:border-zinc-800 flex gap-2">
                                        {friend.phone && (
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-green-600 bg-green-50 hover:bg-green-100 rounded-full" onClick={(e) => {
                                                e.stopPropagation();
                                                if(friend.phone) window.open(`https://wa.me/${friend.phone.replace(/\D/g, '')}`, '_blank');
                                            }}>
                                                <Phone className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {friend.instagram && (
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-pink-600 bg-pink-50 hover:bg-pink-100 rounded-full" onClick={(e) => {
                                                e.stopPropagation();
                                                if(friend.instagram) window.open(`https://instagram.com/${friend.instagram.replace('@', '')}`, '_blank');
                                            }}>
                                                <Instagram className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {friend.linkedin && (
                                            <Button size="icon" variant="ghost" className="h-9 w-9 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-full" onClick={(e) => {
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
                        
                        {/* --- MODAL DE DETALHES COM MENU DE AÇÕES --- */}
                        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-0 max-h-[90vh] overflow-y-auto">
                            
                            {/* Header Visual */}
                            <div className="bg-gradient-to-r from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 p-6 pt-8 pb-12 relative">
                                
                                {/* Título Oculto para Acessibilidade */}
                                <DialogHeader className="sr-only">
                                    <DialogTitle>Perfil de {friend.name}</DialogTitle>
                                    <DialogDescription>Detalhes completos do contato.</DialogDescription>
                                </DialogHeader>

                                {/* BOTÃO DE AÇÕES (CRUD) */}
                                <div className="absolute h-auto w-auto top-4 left-4 flex gap-2 items-center z-20 cursor-pointer">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-white/50 hover:bg-white text-zinc-700">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => setEditingFriend(friend)}>
                                                <Pencil className="h-4 w-4 mr-2" /> Editar
                                            </DropdownMenuItem>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                                    </DropdownMenuItem>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Excluir contato?</AlertDialogTitle>
                                                        <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => friend.id && handleDelete(friend.id)} className="bg-red-600 hover:bg-red-700">Confirmar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex flex-col items-center text-center gap-3 relative z-10">
                                    <Avatar className="h-28 w-28 border-4 border-white dark:border-zinc-950 shadow-xl">
                                        <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                                        <AvatarFallback className="bg-white text-zinc-900 font-black text-3xl">{initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white leading-tight">{friend.name}</h2>
                                        {friend.nickname && <p className="text-indigo-600 dark:text-indigo-400 font-medium text-lg">&quot;{friend.nickname}&quot;</p>}
                                        <div className="flex justify-center mt-2">{getProximityBadge(friend.proximity)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo */}
                            <div className="p-6 space-y-6 -mt-6 bg-white dark:bg-zinc-950 rounded-t-3xl relative z-20 shadow-lg">
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Aniversário</p>
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <Cake className="h-4 w-4 text-pink-500" />
                                            {friend.birthday ? `${format(parseISO(friend.birthday), "dd/MM")} (${age})` : "-"}
                                        </div>
                                        {daysUntil && <Badge variant="secondary" className="mt-1.5 text-[10px] h-5 bg-pink-100 text-pink-600">{daysUntil}</Badge>}
                                    </div>
                                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
                                        <p className="text-[10px] text-zinc-400 font-bold uppercase mb-1">Ideia de Presente</p>
                                        <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                                            <Gift className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                                            <span className="italic leading-tight text-xs">{friend.giftIdeas || "Nada anotado"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div onClick={() => copyToClipboard(friend.pixKey, "Pix")} className="group flex items-center justify-between p-3 rounded-xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 cursor-pointer hover:bg-green-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-200 dark:bg-green-900/50 rounded-full text-green-700"><LinkIcon className="h-4 w-4" /></div>
                                        <div>
                                            <p className="text-[10px] text-green-700/70 font-bold uppercase">Chave Pix</p>
                                            <p className="text-sm font-mono font-bold text-green-800 truncate max-w-[180px]">{friend.pixKey || "Não cadastrada"}</p>
                                        </div>
                                    </div>
                                    {friend.pixKey && <Copy className="h-4 w-4 text-green-600 opacity-50 group-hover:opacity-100" />}
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs text-zinc-500 font-bold uppercase flex items-center gap-2"><MapPin className="h-3 w-3" /> Memória & Notas</p>
                                    <div className="p-4 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 rounded-xl text-sm text-zinc-700 italic leading-relaxed min-h-[80px]">
                                        {friend.notes ? `"${friend.notes}"` : "Nenhuma nota adicionada."}
                                    </div>
                                </div>

                                {friend.phone && (
                                    <Button className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 rounded-xl" onClick={() => { if(friend.phone) window.open(`https://wa.me/${friend.phone.replace(/\D/g, '')}`, '_blank'); }}>
                                        <Phone className="h-5 w-5 mr-2" /> WhatsApp
                                    </Button>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                )
            })}
        </div>
      )}

      {/* MODAL DE EDIÇÃO (Controlado pelo state editingFriend) */}
      <FriendFormDialog 
          mode="edit"
          open={!!editingFriend}
          onOpenChange={(open) => !open && setEditingFriend(null)}
          initialData={editingFriend || undefined}
      />
    </div>
  );
}