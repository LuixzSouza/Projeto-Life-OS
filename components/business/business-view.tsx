"use client"

import { useState, useMemo } from "react"
import { deleteClient, deleteBilling, markBillingReminded } from "@/app/(dashboard)/business/actions"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

import type { ActionResponse, BillingData, ClientData, DeleteTarget, FriendOption } from "./business-types"
import { clearMask, generateChargeMessage, maskPhone } from "./business-helpers"
import { ClientCard } from "./business-client-card"
import { BillingReminders } from "./billing-reminders"
import { ClientModal, DeleteAlert } from "./business-modals"
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog"

// --- COMPONENTE PRINCIPAL ---
// A gestão completa (contratos, faturas, recebimentos) vive na página de detalhe
// /business/[id]. Aqui ficam a lista resumida, a busca, a Central de Cobranças e
// as ações de nível de cliente (criar/editar/excluir/conexões).
export function BusinessView({ initialClients, friends, pixKey, businessName }: { initialClients: ClientData[]; friends: FriendOption[]; pixKey?: string; businessName?: string }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const chargeOpts = { pixKey, businessName }

  // Estados para Modais e Edição
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientData | null>(null)
  const [phoneValue, setPhoneValue] = useState("")

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [connClient, setConnClient] = useState<{ id: string; title: string } | null>(null)

  const handleOpenNewClientModal = () => {
    setEditingClient(null)
    setPhoneValue("")
    setIsClientModalOpen(true)
  }

  const handleOpenEditClientModal = (client: ClientData) => {
    setEditingClient(client)
    setPhoneValue(maskPhone(client.phone || ""))
    setIsClientModalOpen(true)
  }

  const filteredClients = useMemo(() => {
    if (!searchTerm) return initialClients;
    const lower = searchTerm.toLowerCase();
    return initialClients.filter(c =>
      c.name.toLowerCase().includes(lower) ||
      (c.company && c.company.toLowerCase().includes(lower))
    );
  }, [initialClients, searchTerm]);

  // 🟢 Usa o gerador de mensagem
  const handleWhatsappCharge = (phone: string, clientName: string, billing: BillingData) => {
    const rawPhone = clearMask(phone);
    const message = generateChargeMessage(clientName, billing, chargeOpts);
    if (!pixKey) toast.warning("Dica: configure sua chave PIX em Configurações › Perfil › Cobrança.");
    const url = `https://wa.me/55${rawPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Cobrança da Central: abre o WhatsApp e registra que o contrato foi cobrado.
  const handleReminderCharge = async (client: ClientData, billing: BillingData) => {
    if (!client.phone) {
      toast.warning("Cadastre o WhatsApp do cliente para cobrar por aqui.")
      return
    }
    handleWhatsappCharge(client.phone, client.name, billing)
    const res = await markBillingReminded(billing.id) as ActionResponse
    if (res.success) toast.success("Cobrança registrada na Central.")
  }

  // 🟢 Função para apenas copiar a mensagem
  const handleCopyChargeMessage = (clientName: string, billing: BillingData) => {
      const message = generateChargeMessage(clientName, billing, chargeOpts);
      navigator.clipboard.writeText(message);
      if (pixKey) toast.success("Resumo de cobrança copiado!");
      else toast.warning("Copiado — mas configure sua chave PIX em Configurações › Perfil › Cobrança.");
  };

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard.writeText(clearMask(phone))
    setCopiedId(id)
    toast.success("Número copiado!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    const toastId = toast.loading("Excluindo...")

    let res: ActionResponse;
    if (deleteTarget.type === 'CLIENT') {
      res = await deleteClient(deleteTarget.id) as ActionResponse
    } else {
      res = await deleteBilling(deleteTarget.id) as ActionResponse
    }

    if (res.success) {
        toast.success(res.message, { id: toastId })
        setDeleteTarget(null)
    } else {
        toast.error(res.message, { id: toastId })
    }
  }

  return (
    <div className="space-y-8 pb-12">

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative group w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Buscar cliente ou empresa..."
            className="pl-9 border-none bg-muted/50 hover:bg-muted/80 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-border shadow-sm transition-all h-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={handleOpenNewClientModal} className="w-full sm:w-auto shadow-md gap-2 font-bold rounded-xl">
          <Plus size={18} /> Novo Cliente
        </Button>
      </div>

      {/* CENTRAL DE COBRANÇAS */}
      <BillingReminders
        clients={initialClients}
        onCharge={handleReminderCharge}
        onCopyCharge={handleCopyChargeMessage}
      />

      {/* GRID DE CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        {filteredClients.map((client) => (
          <ClientCard
            key={client.id}
            client={client}
            copiedId={copiedId}
            onCopyPhone={handleCopyPhone}
            onEditClient={handleOpenEditClientModal}
            onDeleteTarget={setDeleteTarget}
            onOpenConnections={(c) => setConnClient({ id: c.id, title: c.name })}
          />
        ))}
      </div>

      {/* ================= MODAIS ================= */}
      <ClientModal
        open={isClientModalOpen}
        onOpenChange={setIsClientModalOpen}
        editingClient={editingClient}
        friends={friends}
        phoneValue={phoneValue}
        setPhoneValue={setPhoneValue}
        onSuccess={() => { setIsClientModalOpen(false); setEditingClient(null); }}
      />

      <DeleteAlert
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
      />

      <EntityConnectionsDialog
        entityType="client"
        item={connClient}
        onOpenChange={(o) => !o && setConnClient(null)}
      />

    </div>
  )
}
