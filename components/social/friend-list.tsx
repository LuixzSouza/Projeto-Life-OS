"use client";

import { useState, useMemo } from "react";
import { Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { deleteFriend } from "@/app/(dashboard)/social/actions";
import { FriendFormDialog, FriendData } from "./add-friend-dialog";
import { getBirthdayInfo } from "./friend-helpers";
import { FriendFilterBar } from "./friend-filter-bar";
import { FriendCard } from "./friend-card";
import { FriendDetailModal } from "./friend-detail-modal";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";

// --- COMPONENTE PRINCIPAL ---
export function FriendList({ initialData }: { initialData: FriendData[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");

  // Controle de Modais Centralizado
  const [selectedFriend, setSelectedFriend] = useState<FriendData | null>(null);
  const [editingFriend, setEditingFriend] = useState<FriendData | null>(null);
  const [friendToDelete, setFriendToDelete] = useState<{ id: string, name: string } | null>(null);
  const [connFriend, setConnFriend] = useState<{ id: string; title: string } | null>(null);

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

  return (
    <div className="space-y-8">

      {/* --- BARRA DE BUSCA E FILTROS --- */}
      <FriendFilterBar search={search} onSearchChange={setSearch} filter={filter} onFilterChange={setFilter} />

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
            {filteredAndSortedFriends.map(friend => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onSelect={setSelectedFriend}
                onEdit={setEditingFriend}
                onDelete={setFriendToDelete}
                onConnections={(t) => setConnFriend({ id: t.id, title: t.name })}
              />
            ))}
          </TooltipProvider>
        </div>
      )}

      {/* --- O ÚNICO MODAL DE DETALHES --- */}
      <FriendDetailModal
        friend={selectedFriend}
        onOpenChange={(open) => !open && setSelectedFriend(null)}
        onEdit={(friend) => { setSelectedFriend(null); setEditingFriend(friend); }}
      />

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

      {/* --- TAGS & ANEXOS (tecido conectivo cross-módulo) --- */}
      <EntityConnectionsDialog
        entityType="friend"
        item={connFriend}
        onOpenChange={(o) => !o && setConnFriend(null)}
      />

    </div>
  );
}
