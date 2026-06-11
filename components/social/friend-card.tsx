"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Instagram, Linkedin, Briefcase, Cake, MoreVertical, Pencil, Trash2, MessageCircle, Tag as TagIcon, Mail, ArrowUpRight, Handshake } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getBirthdayInfo, getProximityBadge, calculateAge, safelyParseDate, openWhatsApp } from "./friend-helpers";
import { daysSinceContact, isReconnectDue } from "@/lib/social-contact";
import type { FriendData } from "./add-friend-dialog";

interface FriendCardProps {
  friend: FriendData;
  /** ISO do último contato registrado (null = nunca registrou). */
  lastContactAt?: string | null;
  /** Registrar "falei hoje" (botão 🤝 no rodapé). */
  onContact: (friend: FriendData) => void;
  onSelect: (friend: FriendData) => void;
  onEdit: (friend: FriendData) => void;
  onDelete: (target: { id: string; name: string }) => void;
  onConnections: (target: { id: string; name: string }) => void;
}

export function FriendCard({ friend, lastContactAt, onContact, onSelect, onEdit, onDelete, onConnections }: FriendCardProps) {
  const bdayInfo = getBirthdayInfo(friend.birthday);
  const bdayDate = safelyParseDate(friend.birthday);
  const age = calculateAge(friend.birthday);
  const contactDays = daysSinceContact(lastContactAt);
  const reconnectDue = isReconnectDue(lastContactAt, friend.proximity);
  const initials = friend.name ? friend.name.substring(0, 2).toUpperCase() : "??";
  const tagList = friend.tags ? friend.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
  const linkedClient = friend.clients && friend.clients.length > 0 ? friend.clients[0] : null;

  // Cores da faixa de topo
  const barColor =
    friend.proximity === "FAMILY" ? "bg-purple-500" :
    friend.proximity === "CLOSE" ? "bg-amber-500" :
    friend.proximity === "WORK" ? "bg-blue-500" : "bg-zinc-300";

  // Anel colorido no avatar (combina com a faixa)
  const ringColor =
    friend.proximity === "FAMILY" ? "ring-purple-500/40" :
    friend.proximity === "CLOSE" ? "ring-amber-500/40" :
    friend.proximity === "WORK" ? "ring-blue-500/40" : "ring-border/60";

  return (
    <Card
      onClick={() => onSelect(friend)}
      className="group flex flex-col h-full bg-card rounded-2xl border-border/40 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden relative"
    >
      {/* Faixa de Cor Topo */}
      <div className={cn("absolute top-0 left-0 w-full h-1", barColor)} />

      <CardContent className="p-5 pt-6 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <Avatar className={cn("h-14 w-14 shadow-sm ring-2 ring-offset-2 ring-offset-card group-hover:scale-105 transition-transform duration-300", ringColor)}>
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
                <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => onEdit(friend)}>
                  <Pencil className="h-3.5 w-3.5 mr-2" /> Editar Perfil
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs font-medium cursor-pointer" onClick={() => onConnections({ id: friend.id!, name: friend.name })}>
                  <TagIcon className="h-3.5 w-3.5 mr-2" /> Tags & Anexos
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive focus:bg-destructive/10 text-xs font-medium cursor-pointer" onClick={() => onDelete({ id: friend.id!, name: friend.name })}>
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Contato
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1">
          {/* Linha de status: proximidade + vínculo com Negócios */}
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {getProximityBadge(friend.proximity)}
            {linkedClient && (
              <Link
                href={`/business/${linkedClient.id}`}
                onClick={(e) => e.stopPropagation()}
                title={`Abrir ${linkedClient.name} em Negócios`}
                className="group/cli inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-blue-500/5 text-blue-600 border border-blue-500/15 text-[10px] font-bold hover:bg-blue-500/10 hover:border-blue-500/30 transition-colors"
              >
                <Briefcase className="h-2.5 w-2.5" /> Cliente{friend.clients!.length > 1 ? ` ·${friend.clients!.length}` : ""}
                <ArrowUpRight className="h-2.5 w-2.5 opacity-50 group-hover/cli:opacity-100 transition-opacity" />
              </Link>
            )}
          </div>

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

          {/* ANIVERSÁRIO: alerta forte quando perto; senão, linha sutil com data + idade */}
          {bdayInfo.isSoon ? (
            <div className="mt-3">
              <Badge variant="secondary" className="bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 border-none px-2 py-0.5 gap-1.5 text-[10px] font-bold shadow-none">
                <Cake className="w-3 h-3 fill-pink-500/20" /> {bdayInfo.text}
              </Badge>
            </div>
          ) : bdayDate ? (
            <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Cake className="h-3 w-3 shrink-0 opacity-60" />
              {format(bdayDate, "dd 'de' MMM", { locale: ptBR })}{age != null ? ` · ${age} anos` : ""}
            </p>
          ) : null}

          {/* ÚLTIMO CONTATO: vencido grita (rose); em dia é linha sutil. Sem registro = silêncio. */}
          {contactDays !== null && (
            reconnectDue ? (
              <div className="mt-2">
                <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 border-none px-2 py-0.5 gap-1.5 text-[10px] font-bold shadow-none">
                  <Handshake className="w-3 h-3" /> Sem contato há {contactDays}d — reconectar?
                </Badge>
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Handshake className="h-3 w-3 shrink-0 opacity-60" />
                {contactDays === 0 ? "Contato hoje" : `Último contato há ${contactDays}d`}
              </p>
            )
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
        ) : friend.email ? (
          <Button size="sm" variant="ghost" className="h-8 flex-1 text-foreground/70 hover:bg-muted hover:text-foreground text-xs font-bold" onClick={() => window.open(`mailto:${friend.email}`, '_blank')}>
            <Mail className="h-3.5 w-3.5 mr-1.5" /> E-mail
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground/60 italic my-auto px-2 w-full text-center">Sem contato direto</span>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              disabled={contactDays === 0}
              className={cn(
                "h-8 w-8",
                reconnectDue ? "text-rose-600 hover:bg-rose-500/10" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              onClick={() => onContact(friend)}
            >
              <Handshake className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{contactDays === 0 ? "Contato registrado hoje" : "Falei com essa pessoa hoje"}</TooltipContent>
        </Tooltip>

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
  );
}
