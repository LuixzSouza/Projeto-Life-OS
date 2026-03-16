"use client"

import { useState, useMemo } from "react"
import { useFormStatus } from "react-dom"
import { 
  createClient, 
  createBilling, 
  markInvoiceAsPaid, 
  deleteClient, 
  updateClient, 
  deleteBilling, 
  updateBilling,
  updateInvoice
} from "@/app/(dashboard)/business/actions"

import { 
  Plus, Phone, CheckCircle2, AlertCircle, Briefcase, 
  Building2, Pencil, Loader2, MoreHorizontal, Trash2, Search, Circle,
  CalendarDays, Copy, Check
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// --- TYPES ---
interface InvoiceData { id: string; title: string; value: number; dueDate: Date; status: string; paidAt?: Date | null; }
interface BillingData { id: string; title: string; totalValue: number; status: string; invoices: InvoiceData[] }
interface ClientData { id: string; name: string; company?: string | null; phone?: string | null; document?: string | null; billings: BillingData[] }

type ActionResponse = { success: boolean; message: string; }

// --- HELPERS DE FORMATAÇÃO ---
const maskPhone = (value: string) => {
  if (!value) return ""
  value = value.replace(/\D/g, "")
  value = value.replace(/(\d{2})(\d)/, "($1) $2")
  value = value.replace(/(\d{5})(\d)/, "$1-$2")
  return value.substring(0, 15)
}

const clearMask = (value: string) => value.replace(/\D/g, "")

const formatCurrency = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

const toInputDate = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

// 🟢 NOVO: GERADOR DE MENSAGEM DINÂMICA
const generateChargeMessage = (clientName: string, billing: BillingData): string => {
    // Pega só o primeiro nome
    const firstName = clientName.split(" ")[0];
    
    // Saudação por horário
    const hour = new Date().getHours();
    let greeting = "Bom dia";
    if (hour >= 12 && hour < 18) greeting = "Boa tarde";
    else if (hour >= 18) greeting = "Boa noite";

    // Variações de texto para não soar robótico
    const intros = [
        `td beleza? passando pra te lembrar do acerto referente ao projeto *${billing.title}*.`,
        `tudo bem por aí? Passando pra deixar o resumo das parcelas do *${billing.title}*.`,
        `espero que esteja tudo ótimo! Segue a atualização do nosso projeto *${billing.title}*.`,
        `passando rapidamente para atualizar o status do *${billing.title}*.`
    ];
    const randomIntro = intros[Math.floor(Math.random() * intros.length)];

    // Ordena e formata a lista de faturas
    const sortedInvoices = [...billing.invoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const total = sortedInvoices.length;

    const invoiceLines = sortedInvoices.map((inv, index) => {
        const val = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.value);
        const status = inv.status === 'PAID' ? '✅' : new Date(inv.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        return `${index + 1}/${total} ${val} - ${status}`;
    }).join('\n');

    // Chave PIX (Pode ser puxada do settings depois, mas deixei a sua hardcoded)
    const pixKey = "11561195618";

    return `Oi ${firstName}, ${greeting}! ${randomIntro}\n\n${invoiceLines}\n\nSegue o PIX: ${pixKey}\nObrigado!`;
};


// --- COMPONENTES AUXILIARES ---
interface SubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

function SubmitButton({ children, className, variant = "default" }: SubmitButtonProps) {
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
  const [searchTerm, setSearchTerm] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Estados para Modais e Edição
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<ClientData | null>(null)
  const [phoneValue, setPhoneValue] = useState("") 

  const [selectedClientForBilling, setSelectedClientForBilling] = useState<string | null>(null)
  const [editingBilling, setEditingBilling] = useState<BillingData | null>(null)
  const [editingInvoice, setEditingInvoice] = useState<InvoiceData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'CLIENT' | 'BILLING', id: string, name: string } | null>(null)

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

  // 🟢 ATUALIZADO: Agora usa o gerador de mensagem
  const handleWhatsappCharge = (phone: string, clientName: string, billing: BillingData) => {
    const rawPhone = clearMask(phone);
    const message = generateChargeMessage(clientName, billing);
    const url = `https://wa.me/55${rawPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // 🟢 NOVO: Função para apenas copiar a mensagem
  const handleCopyChargeMessage = (clientName: string, billing: BillingData) => {
      const message = generateChargeMessage(clientName, billing);
      navigator.clipboard.writeText(message);
      toast.success("Resumo de cobrança copiado!");
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

      {/* GRID DE CLIENTES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
        {filteredClients.map((client) => (
            <div key={client.id} className="flex flex-col rounded-[1.5rem] border border-border/40 bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              
              <div className="p-5 flex justify-between items-start border-b border-border/10 bg-muted/5">
                <div className="flex gap-3.5 items-center min-w-0 flex-1">
                  <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/10 shadow-inner">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base truncate text-foreground/90" title={client.name}>
                      {client.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {client.company && (
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/5 text-primary border-none font-medium truncate max-w-[120px]">
                            {client.company}
                          </Badge>
                      )}
                      {client.phone && (
                        <button 
                          onClick={() => handleCopyPhone(client.phone!, client.id)}
                          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors font-mono"
                        >
                          {maskPhone(client.phone)}
                          {copiedId === client.id ? <Check size={10} className="text-emerald-500"/> : <Copy size={10}/>}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted/80">
                      <MoreHorizontal size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl">
                    <DropdownMenuItem onClick={() => handleOpenEditClientModal(client)} className="cursor-pointer">
                      <Pencil className="mr-2 h-4 w-4" /> Editar Cliente
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

              <div className="p-5 flex-1">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-2">
                    <Briefcase size={12} className="text-primary/60"/> Contratos e Projetos
                  </span>
                  <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10 hover:text-primary rounded-lg" onClick={() => setSelectedClientForBilling(client.id)}>
                    <Plus size={14} className="mr-1" /> Novo
                  </Button>
                </div>

                <ScrollArea className="h-[280px] pr-3">
                  <div className="space-y-4">
                    {client.billings.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl bg-muted/10">
                          <p className="text-xs font-medium text-muted-foreground">Nenhum contrato ativo.</p>
                      </div>
                    ) : (
                      client.billings.map((billing) => {
                        const paidInvoices = billing.invoices.filter(i => i.status === 'PAID').length;
                        const totalInvoices = billing.invoices.length;
                        const progress = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
                        const isCompleted = progress === 100;

                        return (
                          <div key={billing.id} className="rounded-xl border border-border/50 bg-background/40 overflow-hidden shadow-sm group/billing">
                            <div className="p-3 border-b border-border/30 bg-muted/20 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <div className="min-w-0 flex-1">
                                        <p className={cn("font-bold text-sm truncate", isCompleted && "text-muted-foreground line-through decoration-2")}>
                                            {billing.title}
                                        </p>
                                        <p className="text-[11px] font-mono text-primary font-bold mt-0.5">
                                            {formatCurrency(billing.totalValue)}
                                        </p>
                                    </div>
                                    <div className="flex gap-1 items-center">
                                        {/* 🟢 NOVO BOTÃO: Copia a mensagem dinâmica do projeto */}
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 opacity-0 group-hover/billing:opacity-100 transition-opacity" 
                                            onClick={() => handleCopyChargeMessage(client.name, billing)}
                                            title="Copiar Resumo da Cobrança"
                                        >
                                            <Copy size={13} />
                                        </Button>

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/billing:opacity-100 transition-opacity">
                                                    <MoreHorizontal size={14} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                                                <DropdownMenuItem onClick={() => setEditingBilling(billing)} className="cursor-pointer font-medium">Ajustar Título/Status</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive cursor-pointer font-medium" onClick={() => setDeleteTarget({ type: 'BILLING', id: billing.id, name: billing.title })}>Excluir Projeto</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Progress value={progress} className="h-1.5 flex-1 bg-muted" indicatorClassName={isCompleted ? "bg-emerald-500" : "bg-primary"} />
                                    <span className={cn("text-[10px] font-black min-w-[28px] text-right", isCompleted ? "text-emerald-600" : "text-muted-foreground")}>
                                        {Math.round(progress)}%
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col">
                              {billing.invoices.map((invoice) => {
                                const isLate = new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID';
                                const isPaid = invoice.status === 'PAID';

                                return (
                                  <div 
                                    key={invoice.id} 
                                    className="flex items-center justify-between p-2.5 px-4 hover:bg-primary/5 transition-colors group/inv border-b border-border/20 last:border-0 cursor-pointer"
                                    onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) setEditingInvoice(invoice); }}
                                  >
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                          {isPaid ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0" /> : 
                                           isLate ? <AlertCircle size={15} className="text-rose-500 shrink-0 animate-pulse" /> : 
                                           <Circle size={15} className="text-muted-foreground/40 shrink-0" />}
                                          
                                          <div className="flex flex-col min-w-0">
                                              <span className={cn("text-[11px] font-semibold truncate", isPaid ? "text-muted-foreground/60 line-through" : "text-foreground")}>
                                                  {invoice.title}
                                              </span>
                                              <span className={cn("text-[9px] font-bold flex items-center gap-1", isLate ? "text-rose-600" : "text-muted-foreground/70")}>
                                                  <CalendarDays size={10}/> {new Date(invoice.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                              </span>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-3 shrink-0">
                                          <span className={cn("text-xs font-bold font-mono", isPaid ? "text-muted-foreground/40" : isLate ? "text-rose-600" : "text-foreground/70")}>
                                              {formatCurrency(invoice.value)}
                                          </span>
                                          {!isPaid && (
                                              <div className="flex items-center gap-1 opacity-0 group-hover/inv:opacity-100 transition-opacity">
                                                  {client.phone && (
                                                      <Button 
                                                        size="icon" 
                                                        variant="ghost" 
                                                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" 
                                                        title="Enviar no WhatsApp"
                                                        onClick={() => handleWhatsappCharge(client.phone!, client.name, billing)} // 🟢 Agora envia a mensagem pronta
                                                      >
                                                          <Phone size={14} />
                                                      </Button>
                                                  )}
                                                  <form action={async () => { 
                                                      const res = await markInvoiceAsPaid(invoice.id) as ActionResponse;
                                                      if(res.success) toast.success(res.message);
                                                      else toast.error(res.message);
                                                  }}>
                                                      <SubmitButton variant="ghost" className="h-7 text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all rounded-lg">
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
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
        ))}
      </div>

      {/* ================= MODAIS ================= */}
      
      {/* Modal Cliente */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[2rem] shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingClient ? "Editar Contato" : "Novo Cliente"}</DialogTitle>
                <DialogDescription>Dados fundamentais para gestão e cobrança.</DialogDescription>
            </DialogHeader>
            <form action={async (fd) => {
                fd.set("phone", clearMask(phoneValue))
                let res: ActionResponse;
                
                if (editingClient) {
                  res = await updateClient(fd) as ActionResponse;
                } else {
                  res = await createClient(fd) as ActionResponse;
                }

                if(res.success) {
                    toast.success(res.message);
                    setIsClientModalOpen(false); 
                    setEditingClient(null);
                } else {
                    toast.error(res.message);
                }
            }} className="space-y-5 pt-4">
                <input type="hidden" name="id" value={editingClient?.id || ""} />
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Nome Completo</Label>
                    <Input name="name" defaultValue={editingClient?.name} required className="rounded-xl bg-muted/20 border-border/40 focus:ring-primary/20 h-12 text-base font-medium" />
                </div>
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Empresa / Subtítulo</Label>
                    <Input name="company" defaultValue={editingClient?.company || ""} placeholder="Ex: Studio Design" className="rounded-xl bg-muted/20 border-border/40 h-12" />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">WhatsApp (Formatado)</Label>
                    <Input 
                      name="phone_display" 
                      value={phoneValue} 
                      onChange={(e) => setPhoneValue(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000" 
                      className="rounded-xl bg-muted/20 border-border/40 h-12 font-mono text-lg" 
                    />
                    <p className="text-[9px] text-muted-foreground px-1">O link do WhatsApp será gerado automaticamente.</p>
                </div>

                <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setIsClientModalOpen(false)}>Cancelar</Button>
                    <SubmitButton className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20">
                      {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
                    </SubmitButton>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Modal Novo Contrato */}
      <Dialog open={!!selectedClientForBilling} onOpenChange={() => setSelectedClientForBilling(null)}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] shadow-2xl">
            <DialogHeader>
                <DialogTitle className="text-xl font-bold">Novo Contrato</DialogTitle>
                <DialogDescription>Defina o valor total e as parcelas.</DialogDescription>
            </DialogHeader>
            <form action={async (fd) => { 
                const res = await createBilling(fd) as ActionResponse; 
                if(res.success) {
                    toast.success(res.message);
                    setSelectedClientForBilling(null); 
                } else {
                    toast.error(res.message);
                }
            }} className="space-y-5 pt-4">
                <input type="hidden" name="clientId" value={selectedClientForBilling || ""} />
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Serviço ou Projeto</Label>
                    <Input name="title" required placeholder="Ex: Consultoria Mensal" className="rounded-xl h-12 bg-muted/20" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Valor Total</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                          <Input type="number" step="0.01" name="totalValue" required className="pl-9 rounded-xl h-12 bg-muted/20 font-mono text-lg" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Parcelas</Label>
                        <Input type="number" name="installments" defaultValue="1" required min="1" className="rounded-xl h-12 bg-muted/20 font-mono text-lg" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Ciclo</Label>
                        <Select name="interval" defaultValue="MONTHLY">
                            <SelectTrigger className="rounded-xl h-12 bg-muted/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl z-[100]">
                                <SelectItem value="MONTHLY">Mensal</SelectItem>
                                <SelectItem value="ANNUAL">Anual</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Venc. Inicial</Label>
                        <Input type="date" name="startDate" defaultValue={toInputDate(new Date())} required className="rounded-xl h-12 bg-muted/20" />
                    </div>
                </div>

                <DialogFooter className="pt-2">
                    <SubmitButton className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">Gerar Faturas</SubmitButton>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ajustar Fatura */}
      <Dialog open={!!editingInvoice} onOpenChange={() => setEditingInvoice(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] shadow-2xl">
            <DialogHeader>
                <DialogTitle className="font-bold">Ajustar Fatura</DialogTitle>
                <DialogDescription>Modifique valores ou data desta parcela específica.</DialogDescription>
            </DialogHeader>
            <form action={async (fd) => { 
                const res = await updateInvoice(fd) as ActionResponse; 
                if(res.success){
                    toast.success(res.message);
                    setEditingInvoice(null); 
                } else {
                    toast.error(res.message);
                }
            }} className="space-y-5 pt-4">
                <input type="hidden" name="id" value={editingInvoice?.id || ""} />
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Descrição</Label>
                    <Input name="title" defaultValue={editingInvoice?.title} required className="rounded-xl h-12 bg-muted/20 font-medium" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Valor Parcela</Label>
                        <Input type="number" step="0.01" name="value" defaultValue={editingInvoice?.value} required className="rounded-xl h-12 bg-muted/20 font-mono" />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Vencimento</Label>
                        <Input 
                            type="date" 
                            name="dueDate" 
                            defaultValue={editingInvoice?.dueDate ? toInputDate(editingInvoice.dueDate) : ""} 
                            required 
                            className="rounded-xl h-12 bg-muted/20" 
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Status de Pagamento</Label>
                    <Select name="status" defaultValue={editingInvoice?.status || "PENDING"}>
                        <SelectTrigger className="rounded-xl h-12 bg-muted/20">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl z-[100]">
                            <SelectItem value="PENDING">Aguardando</SelectItem>
                            <SelectItem value="PAID">Pago / Recebido</SelectItem>
                            <SelectItem value="CANCELED">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <DialogFooter className="pt-4 flex flex-col gap-3">
                    <SubmitButton className="w-full h-12 rounded-xl font-bold">Salvar Ajuste</SubmitButton>
                    {editingInvoice?.status === 'PAID' && editingInvoice?.paidAt && (
                        <p className="text-[10px] text-center text-emerald-600 font-bold uppercase tracking-widest">
                          Recebido em {new Date(editingInvoice.paidAt).toLocaleDateString('pt-BR')}
                        </p>
                    )}
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Contrato */}
      <Dialog open={!!editingBilling} onOpenChange={() => setEditingBilling(null)}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] shadow-2xl">
            <DialogHeader>
                <DialogTitle className="font-bold">Editar Contrato</DialogTitle>
                <DialogDescription>Mude o status geral deste projeto.</DialogDescription>
            </DialogHeader>
            <form action={async (fd) => { 
                const res = await updateBilling(fd) as ActionResponse; 
                if(res.success){
                    toast.success(res.message);
                    setEditingBilling(null); 
                } else {
                    toast.error(res.message);
                }
            }} className="space-y-5 pt-4">
                <input type="hidden" name="id" value={editingBilling?.id || ""} />
                
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Título do Serviço</Label>
                    <Input name="title" defaultValue={editingBilling?.title} required className="rounded-xl h-12 bg-muted/20" />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Status do Projeto</Label>
                    <Select name="status" defaultValue={editingBilling?.status || "ACTIVE"}>
                        <SelectTrigger className="rounded-xl h-12 bg-muted/20">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl z-[100]">
                            <SelectItem value="ACTIVE">Em Andamento</SelectItem>
                            <SelectItem value="COMPLETED">Concluído</SelectItem>
                            <SelectItem value="CANCELED">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                
                <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setEditingBilling(null)}>Cancelar</Button>
                    <SubmitButton className="rounded-xl px-8 font-bold">Salvar</SubmitButton>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Alerta de Exclusão */}
     <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent 
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
            "rounded-[2rem] border border-destructive/20 bg-background p-8 shadow-2xl duration-200",
            "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-4">
                <div className="p-3 rounded-2xl bg-destructive/10">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <AlertDialogTitle className="text-2xl font-bold tracking-tight">
                  Confirmar Exclusão?
                </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-muted-foreground leading-relaxed">
              Você está prestes a remover <strong className="text-foreground break-all">{deleteTarget?.name}</strong>. 
              <span className="block mt-2">
                {deleteTarget?.type === 'CLIENT' 
                  ? "Esta ação é irreversível e apagará todos os contratos, faturas e o histórico financeiro deste cliente no sistema." 
                  : "Esta ação removerá permanentemente este projeto e todas as parcelas/faturas vinculadas a ele."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="rounded-xl h-12 font-bold border-border/60 hover:bg-muted transition-all sm:flex-1">
              Manter Dados
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-12 font-bold px-8 shadow-lg shadow-destructive/20 transition-all sm:flex-1"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}