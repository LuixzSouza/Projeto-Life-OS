"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Globe, Copy, Check, MessageCircle, MoreHorizontal,
  Pencil, Trash2, Tag as TagIcon, Mail, FileText, MapPin, StickyNote, IdCard,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/components/providers/currency-provider";

import { deleteClient, deleteBilling, deleteInvoice } from "@/app/(dashboard)/business/actions";
import type { AccountOption, ActionResponse, BillingData, ClientData, DeleteTarget, FriendOption, InvoiceData } from "./business-types";
import { clearMask, generateChargeMessage, maskPhone } from "./business-helpers";
import { ContractsList } from "./business-contracts";
import { ClientModal, BillingModal, InvoiceModal, BillingEditModal, DeleteAlert, PaymentModal, AddInvoiceModal } from "./business-modals";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";

interface ClientDetailViewProps {
  client: ClientData;
  accounts: AccountOption[];
  friends: FriendOption[];
  pixKey?: string;
  businessName?: string;
}

export function ClientDetailView({ client, accounts, friends, pixKey, businessName }: ClientDetailViewProps) {
  const router = useRouter();
  const formatCurrency = useFormatCurrency();
  const chargeOpts = { pixKey, businessName };

  const [copied, setCopied] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientData | null>(null);
  const [phoneValue, setPhoneValue] = useState("");

  const [selectedClientForBilling, setSelectedClientForBilling] = useState<string | null>(null);
  const [editingBilling, setEditingBilling] = useState<BillingData | null>(null);
  const [addingInvoiceTo, setAddingInvoiceTo] = useState<{ id: string; title: string } | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<InvoiceData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [connClient, setConnClient] = useState<{ id: string; title: string } | null>(null);

  // Resumo financeiro do cliente.
  const { receivable, overdue, earned } = useMemo(() => {
    const now = new Date();
    const all = client.billings.flatMap(b => b.invoices);
    const open = all.filter(i => i.status !== 'PAID' && i.status !== 'CANCELED');
    return {
      receivable: open.filter(i => new Date(i.dueDate) >= now).reduce((s, i) => s + i.value, 0),
      overdue: open.filter(i => new Date(i.dueDate) < now).reduce((s, i) => s + i.value, 0),
      earned: all.filter(i => i.status === 'PAID').reduce((s, i) => s + i.value, 0),
    };
  }, [client]);

  const handleWhatsappCharge = (phone: string, clientName: string, billing: BillingData) => {
    const message = generateChargeMessage(clientName, billing, chargeOpts);
    if (!pixKey) toast.warning("Dica: configure sua chave PIX em Configurações › Perfil › Cobrança.");
    window.open(`https://wa.me/55${clearMask(phone)}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCopyChargeMessage = (clientName: string, billing: BillingData) => {
    const message = generateChargeMessage(clientName, billing, chargeOpts);
    navigator.clipboard.writeText(message);
    if (pixKey) toast.success("Resumo de cobrança copiado!");
    else toast.warning("Copiado — mas configure sua chave PIX em Configurações › Perfil › Cobrança.");
  };

  const handleCopyPhone = () => {
    if (!client.phone) return;
    navigator.clipboard.writeText(clearMask(client.phone));
    setCopied(true);
    toast.success("Número copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    const toastId = toast.loading("Excluindo...");
    const res = (deleteTarget.type === 'CLIENT'
      ? await deleteClient(deleteTarget.id)
      : deleteTarget.type === 'INVOICE'
        ? await deleteInvoice(deleteTarget.id)
        : await deleteBilling(deleteTarget.id)) as ActionResponse;

    if (res.success) {
      toast.success(res.message, { id: toastId });
      const wasClient = deleteTarget.type === 'CLIENT';
      setDeleteTarget(null);
      if (wasClient) router.push("/business"); // o cliente não existe mais
      else router.refresh(); // recarrega contratos/resumo já resincronizados
    } else {
      toast.error(res.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* CABEÇALHO DO CLIENTE */}
      <div className="flex flex-col gap-4">
        <Link href="/business" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary transition-colors w-fit">
          <ArrowLeft size={16} /> Voltar para Negócios
        </Link>

        <div className="flex justify-between items-start gap-4 rounded-[1.5rem] border border-border/40 bg-card/50 p-5 sm:p-6 shadow-sm">
          <div className="flex gap-4 items-center min-w-0 flex-1">
            <Avatar className="h-16 w-16 shrink-0 rounded-2xl border border-primary/10 shadow-inner">
              <AvatarImage src={client.imageUrl || undefined} className="object-cover" alt={client.name} />
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-2xl">
                {client.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-xl sm:text-2xl truncate text-foreground" title={client.name}>{client.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {client.company && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-[11px] bg-primary/5 text-primary border-none font-medium">
                    {client.company}
                  </Badge>
                )}
                {client.website && (
                  <a
                    href={client.website.startsWith("http") ? client.website : `https://${client.website}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Globe size={12} /> Site
                  </a>
                )}
                {client.phone && (
                  <button onClick={handleCopyPhone} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors font-mono">
                    {maskPhone(client.phone)}
                    {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                )}
              </div>

              {client.friend && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground" title={`Contato: ${client.friend.name}`}>
                  <Avatar className="h-5 w-5 border border-border/40">
                    <AvatarImage src={client.friend.imageUrl || undefined} className="object-cover" alt={client.friend.name} />
                    <AvatarFallback className="bg-muted text-[9px] font-bold">{client.friend.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-foreground/80 min-w-0">{client.friend.name}</span>
                  {client.friend.jobTitle && <span className="truncate opacity-70 hidden sm:inline">· {client.friend.jobTitle}</span>}
                  {client.friend.phone && (
                    <button
                      type="button"
                      onClick={() => window.open(`https://wa.me/55${clearMask(client.friend!.phone!)}`, "_blank")}
                      title={`Falar com ${client.friend.name} no WhatsApp`}
                      className="ml-0.5 flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-colors shrink-0"
                    >
                      <MessageCircle size={10} /> Zap
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted/80">
                <MoreHorizontal size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
              <DropdownMenuItem onClick={() => { setEditingClient(client); setPhoneValue(maskPhone(client.phone || "")); setIsClientModalOpen(true); }} className="cursor-pointer">
                <Pencil className="mr-2 h-4 w-4" /> Editar Cliente
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConnClient({ id: client.id, title: client.name })} className="cursor-pointer">
                <TagIcon className="mr-2 h-4 w-4" /> Tags & Anexos
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                onClick={() => setDeleteTarget({ type: 'CLIENT', id: client.id, name: client.name })}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir Cliente
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* RESUMO FINANCEIRO */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Recebido</p>
          <p className="text-xl font-bold font-mono text-foreground mt-1">{formatCurrency(earned)}</p>
        </div>
        <div className="rounded-2xl border border-transparent bg-emerald-50/50 dark:bg-emerald-950/10 p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">A Receber</p>
          <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 mt-1">{formatCurrency(receivable)}</p>
        </div>
        <div className={cn("rounded-2xl border border-transparent p-4 shadow-sm", overdue > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/30")}>
          <p className={cn("text-[10px] font-black uppercase tracking-widest", overdue > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>Em Atraso</p>
          <p className={cn("text-xl font-bold font-mono mt-1", overdue > 0 ? "text-red-700 dark:text-red-300" : "text-muted-foreground/60")}>{formatCurrency(overdue)}</p>
        </div>
      </div>

      {/* CONTRATOS + INFORMAÇÕES — a lista flui na página (scroll natural, nada preso). */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-border/40 bg-card/50 p-5 sm:p-6 shadow-sm lg:col-span-2">
          <ContractsList
            client={client}
            onNewBilling={setSelectedClientForBilling}
            onEditBilling={setEditingBilling}
            onEditInvoice={setEditingInvoice}
            onReceiveInvoice={setPayingInvoice}
            onCopyCharge={handleCopyChargeMessage}
            onWhatsapp={handleWhatsappCharge}
            onDeleteTarget={setDeleteTarget}
            onAddInvoice={setAddingInvoiceTo}
          />
        </div>

        {/* Ficha do cliente: campos que antes ficavam invisíveis (email, documento,
            endereço, notas). Editáveis pelo menu ⋯ → Editar Cliente. */}
        <div className="rounded-[1.5rem] border border-border/40 bg-card/50 p-5 sm:p-6 shadow-sm space-y-4">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-2">
            <IdCard size={12} className="text-primary/60" /> Ficha do Cliente
          </span>

          <div className="space-y-3">
            <InfoRow icon={Mail} label="Email" value={client.email} href={client.email ? `mailto:${client.email}` : undefined} />
            <InfoRow icon={FileText} label="CPF / CNPJ" value={client.document} mono />
            <InfoRow icon={MapPin} label="Endereço" value={client.address} />
            {client.notes ? (
              <div className="rounded-xl border border-border/40 bg-background/60 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <StickyNote size={11} /> Notas internas
                </p>
                <p className="whitespace-pre-line text-xs leading-relaxed text-foreground/80">{client.notes}</p>
              </div>
            ) : null}
            {!client.email && !client.document && !client.address && !client.notes && (
              <p className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground">
                Sem dados extras ainda — use <strong>⋯ → Editar Cliente</strong> para preencher email, documento, endereço e notas.
              </p>
            )}
          </div>
        </div>
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

      <PaymentModal
        key={payingInvoice?.id || "payment"}
        invoice={payingInvoice}
        accounts={accounts}
        onClose={() => setPayingInvoice(null)}
      />

      <BillingModal clientId={selectedClientForBilling} onClose={() => setSelectedClientForBilling(null)} />
      <InvoiceModal invoice={editingInvoice} onClose={() => setEditingInvoice(null)} />
      <BillingEditModal billing={editingBilling} onClose={() => setEditingBilling(null)} />
      <AddInvoiceModal billing={addingInvoiceTo} onClose={() => setAddingInvoiceTo(null)} />

      <DeleteAlert target={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={executeDelete} />

      <EntityConnectionsDialog
        entityType="client"
        item={connClient}
        onOpenChange={(o) => !o && setConnClient(null)}
      />
    </div>
  );
}

// Linha da Ficha do Cliente: ícone + rótulo + valor (some quando vazio).
function InfoRow({
  icon: Icon, label, value, href, mono,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string | null;
  href?: string;
  mono?: boolean;
}) {
  if (!value) return null;
  const content = (
    <p className={cn("text-xs font-medium text-foreground break-words", mono && "font-mono")}>{value}</p>
  );
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary/70">
        <Icon size={13} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} className="hover:underline">{content}</a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
