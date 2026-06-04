"use client";

import { format } from "date-fns";
import { toast } from "sonner";
import { MapPin, Cake, Link as LinkIcon, Copy, Gift, Hash, Pencil, MessageCircle, Mail, Instagram, Linkedin, Phone, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { calculateAge, getBirthdayInfo, getProximityBadge, safelyParseDate, openWhatsApp } from "./friend-helpers";
import type { FriendData } from "./add-friend-dialog";

interface FriendDetailModalProps {
  friend: FriendData | null;
  onOpenChange: (open: boolean) => void;
  onEdit?: (friend: FriendData) => void;
}

// Faixa de cor por proximidade (combina com o card)
const proximityBar = (p?: string) =>
  p === "FAMILY" ? "from-purple-500/20" :
  p === "CLOSE" ? "from-amber-500/20" :
  p === "WORK" ? "from-blue-500/20" : "from-zinc-400/20";

export function FriendDetailModal({ friend, onOpenChange, onEdit }: FriendDetailModalProps) {
  const copyToClipboard = (text: string | null | undefined, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada!`);
  };

  return (
    <Dialog open={!!friend} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0">
        {friend && (() => {
          const age = calculateAge(friend.birthday);
          const bdayInfo = getBirthdayInfo(friend.birthday);
          const initials = friend.name ? friend.name.substring(0, 2).toUpperCase() : "??";
          const tagList = friend.tags ? friend.tags.split(",").map(t => t.trim()).filter(Boolean) : [];

          const igHandle = friend.instagram?.replace("@", "").trim();
          const hasContact = friend.phone || friend.email || igHandle || friend.linkedin;

          return (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>Perfil de {friend.name}</DialogTitle>
                <DialogDescription>Detalhes e contexto do contato.</DialogDescription>
              </DialogHeader>

              {/* Topo: Avatar e Nome */}
              <div className={cn("relative p-8 pt-10 border-b border-border/40 flex flex-col items-center text-center bg-gradient-to-b to-background", proximityBar(friend.proximity))}>
                {/* Botão Editar */}
                {onEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onEdit(friend)}
                    className="absolute top-4 right-4 h-8 gap-1.5 rounded-lg text-xs font-medium bg-background/80 backdrop-blur shadow-sm hover:bg-background"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                )}

                <Avatar className="h-28 w-28 border-4 border-background shadow-xl mb-4">
                  <AvatarImage src={friend.imageUrl || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/5 text-primary font-black text-3xl">{initials}</AvatarFallback>
                </Avatar>

                <h2 className="text-2xl font-bold text-foreground leading-tight">{friend.name}</h2>
                {friend.nickname && <p className="text-primary font-medium text-sm mt-1">&quot;{friend.nickname}&quot;</p>}

                {(friend.jobTitle || friend.company) && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3 opacity-60" />
                    {friend.jobTitle}{friend.jobTitle && friend.company && " • "}
                    {friend.company && <span className="font-semibold text-foreground/80">{friend.company}</span>}
                  </p>
                )}

                <div className="mt-3">{getProximityBadge(friend.proximity)}</div>
              </div>

              {/* Corpo: Informações */}
              <ScrollArea className="max-h-[52vh]">
                <div className="p-6 md:p-8 space-y-6">

                  {/* Ações de Contato */}
                  {hasContact && (
                    <div className="flex flex-wrap gap-2">
                      {friend.phone && (
                        <Button size="sm" variant="outline" className="h-9 gap-2 rounded-xl text-xs font-medium text-emerald-600 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10" onClick={() => openWhatsApp(friend.phone)}>
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </Button>
                      )}
                      {friend.phone && (
                        <Button size="sm" variant="outline" className="h-9 gap-2 rounded-xl text-xs font-medium" onClick={() => copyToClipboard(friend.phone, "Telefone")}>
                          <Phone className="h-3.5 w-3.5" /> {friend.phone}
                        </Button>
                      )}
                      {friend.email && (
                        <Button size="sm" variant="outline" className="h-9 gap-2 rounded-xl text-xs font-medium" onClick={() => copyToClipboard(friend.email, "Email")}>
                          <Mail className="h-3.5 w-3.5" /> {friend.email}
                        </Button>
                      )}
                      {igHandle && (
                        <Button size="sm" variant="outline" className="h-9 gap-2 rounded-xl text-xs font-medium text-pink-600 border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10" onClick={() => window.open(`https://instagram.com/${igHandle}`, "_blank")}>
                          <Instagram className="h-3.5 w-3.5" /> @{igHandle}
                        </Button>
                      )}
                      {friend.linkedin && (
                        <Button size="sm" variant="outline" className="h-9 gap-2 rounded-xl text-xs font-medium text-blue-600 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10" onClick={() => window.open(friend.linkedin || "", "_blank")}>
                          <Linkedin className="h-3.5 w-3.5" /> LinkedIn
                        </Button>
                      )}
                    </div>
                  )}

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

                  {/* Vínculo com Negócios */}
                  {friend.clients && friend.clients.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1.5"><Briefcase className="h-3 w-3 text-blue-500" /> É seu cliente em Negócios</p>
                      <div className="flex flex-wrap gap-2">
                        {friend.clients.map(c => (
                          <Badge key={c.id} variant="secondary" className="px-2.5 py-1 bg-blue-500/5 text-blue-600 border-blue-500/10 font-semibold">
                            {c.name}{c.company ? ` · ${c.company}` : ""}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1.5"><Cake className="h-3 w-3 text-pink-500" /> Aniversário</p>
                      <p className="text-sm font-semibold text-foreground">
                        {friend.birthday ? `${format(safelyParseDate(friend.birthday)!, "dd/MM")}${age != null ? ` (${age} anos)` : ""}` : "Não informado"}
                      </p>
                      {bdayInfo.text && <Badge variant="secondary" className="mt-2 text-[10px] bg-pink-500/10 text-pink-600 border-none">{bdayInfo.text}</Badge>}
                    </div>
                    <div className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1.5"><Gift className="h-3 w-3 text-purple-500" /> Ideias de Presente</p>
                      <p className="text-sm text-foreground/80 leading-snug">
                        {friend.giftIdeas || <span className="italic opacity-60">Sem ideias registradas.</span>}
                      </p>
                    </div>
                  </div>

                  {friend.pixKey && (
                    <div onClick={() => copyToClipboard(friend.pixKey, "Chave Pix")} className="group flex items-center justify-between p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600"><LinkIcon className="h-4 w-4" /></div>
                        <div>
                          <p className="text-[10px] text-emerald-600/80 font-bold uppercase">Chave Pix</p>
                          <p className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-500 truncate max-w-[200px]">{friend.pixKey}</p>
                        </div>
                      </div>
                      <Copy className="h-4 w-4 text-emerald-600 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Anotações & Endereço</p>
                    <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl text-sm text-foreground/90 min-h-[80px] whitespace-pre-wrap leading-relaxed">
                      {friend.notes ? friend.notes : <span className="italic opacity-60">Nenhuma anotação extra. Pense em como vocês se conheceram ou gostos dessa pessoa!</span>}
                      {friend.address && <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground flex gap-1.5"><MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" /> {friend.address}</div>}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
