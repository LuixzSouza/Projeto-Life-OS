'use client'

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { 
  createClient, createBilling, markInvoiceAsPaid, deleteClient, updateClient, 
  deleteBilling, updateBilling 
} from "@/app/(dashboard)/business/actions"

import { 
  Plus, Phone, CheckCircle, Clock, AlertCircle, Briefcase, 
  Building2, Pencil, Loader2, Ban, CheckCheck, MoreHorizontal, Trash2 
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// --- NOVOS IMPORTS: MENUS E MODAIS DE ALERTA ---
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// --- INTERFACES ---
interface InvoiceData {
  id: string
  title: string
  value: number | string
  dueDate: Date | string
  status: string
}

interface BillingData {
  id: string
  title: string
  totalValue: number | string
  status: string
  invoices: InvoiceData[]
}

interface ClientData {
  id: string
  name: string
  company?: string | null
  phone?: string | null
  document?: string | null
  billings: BillingData[]
}

// --- BOTÃO COM LOADING ---
function SubmitButton({ children, className, variant = "default" }: { children: React.ReactNode, className?: string, variant?: "default" | "destructive" | "outline" }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  )
}

// --- COMPONENTE PRINCIPAL ---
export function BusinessView({ initialClients }: { initialClients: ClientData[] }) {
  // --- STATES DE MODAIS ---
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientData | null>(null)
  
  const [selectedClientForBilling, setSelectedClientForBilling] = useState<string | null>(null)
  const [editingBilling, setEditingBilling] = useState<BillingData | null>(null)

  // --- STATE PARA O MODAL DE EXCLUSÃO (SUBSTITUI O CONFIRM) ---
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'CLIENT' | 'BILLING', id: string, name: string } | null>(null)

  // --- HELPERS ---
  const handleWhatsappCharge = (phone: string, clientName: string, invoiceTitle: string, value: number | string) => {
    const numericValue = Number(value)
    const formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numericValue)
    const message = `Olá ${clientName}, tudo bem? Passando para lembrar sobre a fatura *${invoiceTitle}* no valor de *${formattedValue}*.`
    const url = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const formatCurrency = (val: number | string) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val))
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      case 'CANCELED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'COMPLETED': return <CheckCheck size={12} className="mr-1" />
      case 'CANCELED': return <Ban size={12} className="mr-1" />
      default: return <Clock size={12} className="mr-1" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch(status) {
        case 'COMPLETED': return 'Concluído'
        case 'CANCELED': return 'Cancelado'
        default: return 'Em Andamento'
      }
  }

  // --- FUNÇÃO CENTRAL DE DELETAR ---
  const executeDelete = async () => {
    if (!deleteTarget) return

    if (deleteTarget.type === 'CLIENT') {
      await deleteClient(deleteTarget.id)
    } else {
      await deleteBilling(deleteTarget.id)
    }
    setDeleteTarget(null) // Fecha o modal
  }

  const openCreateClient = () => {
    setEditingClient(null)
    setIsClientModalOpen(true)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Botão Novo Cliente */}
      <div className="flex justify-end">
        <Button onClick={openCreateClient} className="gap-2 shadow-sm">
          <Plus size={18} /> Novo Cliente
        </Button>
      </div>

      {/* Grid de Clientes (RESPONSIVO E SEM QUEBRA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {initialClients.map((client) => (
          <Card key={client.id} className="shadow-sm hover:shadow-md transition-all flex flex-col border-zinc-200 dark:border-zinc-800 overflow-hidden">
            
            {/* Header do Cliente */}
            <CardHeader className="pb-3 pt-5 px-5">
              <div className="flex justify-between items-start gap-3">
                {/* Lado Esquerdo: Avatar e Infos */}
                <div className="flex gap-3 items-center min-w-0 flex-1">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary border border-primary/20">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate leading-tight" title={client.name}>
                        {client.name}
                    </CardTitle>
                    <CardDescription className="flex flex-col gap-0.5 mt-1">
                        <span className="flex items-center gap-1.5 truncate text-xs">
                            <Building2 size={11} className="shrink-0"/> {client.company || "Pessoa Física"}
                        </span>
                        <span className="flex items-center gap-1.5 truncate text-xs">
                            <Phone size={11} className="shrink-0"/> {client.phone || "Sem telefone"}
                        </span>
                    </CardDescription>
                  </div>
                </div>
                
                {/* Lado Direito: Menu de Ações (Dropdown) */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => { setEditingClient(client); setIsClientModalOpen(true); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar Cliente
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
                      onClick={() => setDeleteTarget({ type: 'CLIENT', id: client.id, name: client.name })}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Excluir Cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <Separator />

            {/* Lista de Cobranças */}
            <CardContent className="flex-1 pt-4 px-4 pb-4 bg-muted/5">
              <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Briefcase size={13} /> Contratos
                  </h4>
                  <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1 border-primary/20 text-primary hover:bg-primary/10" onClick={() => setSelectedClientForBilling(client.id)}>
                    <Plus size={10} /> Nova
                  </Button>
              </div>

              <ScrollArea className="h-[220px] pr-2.5">
                <div className="space-y-3">
                  {client.billings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-20 text-muted-foreground text-xs italic border-2 border-dashed rounded-lg bg-background/50">
                        <Briefcase className="h-5 w-5 mb-1.5 opacity-20" />
                        Nenhum contrato.
                    </div>
                  ) : (
                    client.billings.map((billing) => (
                      <div key={billing.id} className="bg-background rounded-lg p-2.5 border shadow-sm group/billing relative transition-all hover:border-primary/20">
                        
                        {/* Header da Cobrança */}
                        <div className="flex justify-between items-start mb-2 pb-2 border-b border-dashed gap-2">
                          
                          {/* Título e Status (Com Truncate para não quebrar) */}
                          <div className="flex flex-col flex-1 min-w-0">
                             <span className="font-medium text-xs truncate" title={billing.title}>
                                {billing.title}
                             </span>
                             <span className={`text-[9px] mt-1 flex items-center w-fit px-1.5 py-0.5 rounded-sm ${getStatusColor(billing.status)}`}>
                                {getStatusIcon(billing.status)}
                                {getStatusLabel(billing.status)}
                             </span>
                          </div>

                          {/* Valor e Ações */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <Badge variant="secondary" className="font-mono text-[9px] h-5 px-1.5">
                                {formatCurrency(billing.totalValue)}
                            </Badge>
                            
                            {/* Dropdown de Ações do Contrato */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 -mr-1.5 text-muted-foreground hover:text-primary">
                                  <MoreHorizontal size={12} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingBilling(billing)}>
                                  <Pencil className="mr-2 h-3 w-3" /> Editar Status
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600 cursor-pointer"
                                  onClick={() => setDeleteTarget({ type: 'BILLING', id: billing.id, name: billing.title })}
                                >
                                  <Trash2 className="mr-2 h-3 w-3" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Faturas */}
                        <div className="space-y-1.5">
                          {billing.invoices.map((invoice) => {
                            const dueDateObj = new Date(invoice.dueDate)
                            const isLate = dueDateObj < new Date() && invoice.status !== 'PAID'
                            const isPaid = invoice.status === 'PAID'

                            return (
                              <div key={invoice.id} className="flex items-center justify-between text-[11px] p-1.5 hover:bg-muted/50 rounded transition gap-2">
                                <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                  {isPaid ? <CheckCircle size={12} className="text-emerald-500 shrink-0" /> : isLate ? <AlertCircle size={12} className="text-red-500 shrink-0" /> : <Clock size={12} className="text-amber-500 shrink-0" />}
                                  
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className={`truncate ${isPaid ? "text-muted-foreground line-through decoration-zinc-500/50" : "font-medium"}`}>{invoice.title}</span>
                                    <span className={`text-[9px] ${isLate ? "text-red-500 font-bold" : "text-muted-foreground"}`}>{dueDateObj.toLocaleDateString('pt-BR')}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono font-medium">{formatCurrency(invoice.value)}</span>
                                  {!isPaid && (
                                    <div className="flex gap-1">
                                      {client.phone && (
                                        <Button size="icon" variant="ghost" className="h-5 w-5 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700" onClick={() => handleWhatsappCharge(client.phone!, client.name, invoice.title, invoice.value)} title="Enviar no Zap">
                                          <Phone size={10} />
                                        </Button>
                                      )}
                                      <form action={async () => await markInvoiceAsPaid(invoice.id)}>
                                        <SubmitButton className="h-5 px-1.5 text-[9px]">
                                            Pagar
                                        </SubmitButton>
                                      </form>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- MODAL DE EXCLUSÃO (CORRIGIDO: CENTRALIZADO) --- */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        {/* ADICIONEI CLASSES AQUI PARA FORÇAR O CENTRO */}
        <AlertDialogContent className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{deleteTarget?.name}</strong>.
              <br />
              {deleteTarget?.type === 'CLIENT' 
                ? "Isso apagará permanentemente o cliente e TODOS os contratos e faturas associados. Esta ação não pode ser desfeita."
                : "Isso apagará o contrato e todas as faturas (pagas ou pendentes) geradas por ele."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={executeDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
            >
                Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- MODAL CLIENTE (Create/Edit) --- */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-border my-auto">
            <CardHeader>
              <CardTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</CardTitle>
              <CardDescription>{editingClient ? "Atualize os dados abaixo." : "Cadastre um novo contato."}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                if (editingClient) await updateClient(formData); else await createClient(formData);
                setIsClientModalOpen(false); setEditingClient(null);
              }} className="space-y-4">
                <input type="hidden" name="id" value={editingClient?.id || ""} />
                
                <div className="space-y-1">
                  <Label>Nome do Cliente</Label>
                  <Input name="name" placeholder="Ex: João da Silva" defaultValue={editingClient?.name} required />
                </div>
                <div className="space-y-1">
                  <Label>Empresa (Opcional)</Label>
                  <Input name="company" placeholder="Ex: Padaria Central" defaultValue={editingClient?.company || ""} />
                </div>
                <div className="space-y-1">
                  <Label>WhatsApp (Apenas números)</Label>
                  <Input name="phone" placeholder="Ex: 5511999999999" defaultValue={editingClient?.phone || ""} />
                </div>
                <div className="space-y-1">
                  <Label>CPF/CNPJ (Opcional)</Label>
                  <Input name="document" placeholder="000.000.000-00" defaultValue={editingClient?.document || ""} />
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="outline" onClick={() => setIsClientModalOpen(false)}>Cancelar</Button>
                  <SubmitButton className="bg-primary">{editingClient ? "Salvar" : "Criar"}</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- MODAL NOVA COBRANÇA --- */}
      {selectedClientForBilling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-border my-auto">
            <CardHeader>
              <CardTitle>Nova Cobrança</CardTitle>
              <CardDescription>Gere faturas e cronograma financeiro.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                await createBilling(formData); setSelectedClientForBilling(null);
              }} className="space-y-4">
                <input type="hidden" name="clientId" value={selectedClientForBilling} />
                
                <div className="space-y-1">
                  <Label>Título do Serviço</Label>
                  <Input name="title" placeholder="Ex: Site Institucional" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Valor Total (R$)</Label>
                    <Input type="number" step="0.01" name="totalValue" placeholder="0.00" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Parcelas</Label>
                    <Input type="number" name="installments" defaultValue="1" min="1" required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Data 1ª Parcela</Label>
                  <Input type="date" name="startDate" defaultValue={today} required />
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="outline" onClick={() => setSelectedClientForBilling(null)}>Cancelar</Button>
                  <SubmitButton className="bg-emerald-600 hover:bg-emerald-700 text-white">Gerar Faturas</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- MODAL EDITAR CONTRATO --- */}
      {editingBilling && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl border-none ring-1 ring-border my-auto">
            <CardHeader>
              <CardTitle>Editar Contrato</CardTitle>
              <CardDescription>Altere o título ou status do serviço.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => {
                await updateBilling(formData); setEditingBilling(null);
              }} className="space-y-4">
                <input type="hidden" name="id" value={editingBilling.id} />
                
                <div className="space-y-1">
                  <Label>Título do Serviço</Label>
                  <Input name="title" defaultValue={editingBilling.title} required />
                </div>

                <div className="space-y-1">
                  <Label>Status do Projeto</Label>
                  <Select name="status" defaultValue={editingBilling.status || "ACTIVE"}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">Em Andamento (Ativo)</SelectItem>
                        <SelectItem value="COMPLETED">Concluído</SelectItem>
                        <SelectItem value="CANCELED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-400">
                    <p><strong>Nota:</strong> Para alterar valores ou datas, por segurança contábil, exclua este contrato e crie um novo.</p>
                </div>
                
                <div className="flex justify-end gap-2 mt-6">
                  <Button type="button" variant="outline" onClick={() => setEditingBilling(null)}>Cancelar</Button>
                  <SubmitButton className="bg-primary">Salvar Alterações</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}