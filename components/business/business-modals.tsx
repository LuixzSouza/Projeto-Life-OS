"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, Upload, Trash2, Loader2, Building2, FileText, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { compressImageFile } from "@/lib/image";
import {
  createClient, createBilling, updateClient,
  updateBilling, updateInvoice, receiveInvoicePayment, addInvoice,
} from "@/app/(dashboard)/business/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { useCurrencySymbol, useFormatCurrency } from "@/components/providers/currency-provider";
import { clearMask, maskPhone, toInputDate } from "./business-helpers";
import type { AccountOption, ActionResponse, BillingData, ClientData, DeleteTarget, FriendOption, InvoiceData } from "./business-types";
import { EntityConnections } from "@/components/connect/entity-connections";

// --- Modal Cliente (criar/editar) ---
interface ClientModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingClient: ClientData | null;
  friends: FriendOption[];
  phoneValue: string;
  setPhoneValue: (v: string) => void;
  onSuccess: () => void;
}

const NO_FRIEND = "__none__";

export function ClientModal({ open, onOpenChange, editingClient, friends, phoneValue, setPhoneValue, onSuccess }: ClientModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [friendId, setFriendId] = useState<string>(NO_FRIEND);
  const [uploading, setUploading] = useState(false);

  // Sincroniza os estados controlados (foto/conexão) sempre que o modal abre,
  // para refletir o cliente em edição (ou limpar ao cadastrar um novo).
  useEffect(() => {
    if (open) {
      setImageUrl(editingClient?.imageUrl || "");
      setFriendId(editingClient?.friendId || NO_FRIEND);
    }
  }, [open, editingClient]);

  const initialName = editingClient?.name || "";

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      input.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo de 10MB.");
      input.value = "";
      return;
    }
    try {
      setUploading(true);
      const compressed = await compressImageFile(file, { maxDimension: 400, quality: 0.85 });
      setImageUrl(compressed);
    } catch {
      toast.error("Não foi possível processar a imagem.");
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  const linkedFriend = friends.find(f => f.id === friendId);

  const labelCls = "text-[10px] uppercase font-black text-muted-foreground ml-1";
  const inputCls = "rounded-xl bg-muted/20 border-border/40 h-11";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
          <DialogHeader
            icon={<Building2 className="h-5 w-5" />}
            title={editingClient ? "Editar Cliente" : "Novo Cliente"}
            description="Dados da empresa, contato e vínculo com suas Conexões."
          />
          <form action={async (fd) => {
              fd.set("phone", clearMask(phoneValue))
              fd.set("imageUrl", imageUrl)
              fd.set("friendId", friendId === NO_FRIEND ? "" : friendId)
              let res: ActionResponse;

              if (editingClient) {
                res = await updateClient(fd) as ActionResponse;
              } else {
                res = await createClient(fd) as ActionResponse;
              }

              if(res.success) {
                  toast.success(res.message);
                  onSuccess();
              } else {
                  toast.error(res.message);
              }
          }} className="flex flex-col flex-1 min-h-0">
              <input type="hidden" name="id" value={editingClient?.id || ""} />

              <DialogBody className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">

                {/* COLUNA ESQUERDA: Identidade */}
                <div className="space-y-5">
                  {/* Foto da empresa */}
                  <div className="flex items-center gap-4 bg-muted/10 border border-border/40 rounded-2xl p-4">
                    <div className="relative group/av cursor-pointer shrink-0" onClick={() => fileRef.current?.click()} title="Enviar logo/foto">
                      <Avatar className="h-16 w-16 rounded-2xl border border-border/50 shadow-sm">
                        <AvatarImage src={imageUrl || undefined} className="object-cover" />
                        <AvatarFallback className="rounded-2xl bg-primary/10 text-primary font-bold text-xl">
                          {(initialName || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/55 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover/av:opacity-100 transition-opacity">
                        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <p className="text-[11px] font-bold text-foreground">Logo da Empresa</p>
                      <div className="flex gap-1.5">
                        <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] rounded-lg" onClick={() => fileRef.current?.click()} disabled={uploading}>
                          <Upload className="h-3 w-3 mr-1" /> Enviar
                        </Button>
                        {imageUrl && (
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-[11px] rounded-lg text-destructive hover:bg-destructive/10" onClick={() => setImageUrl("")}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <input type="file" ref={fileRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleLogoFile} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                      <Label className={labelCls}>Nome do Cliente</Label>
                      <Input name="name" defaultValue={editingClient?.name} required className={cn(inputCls, "font-medium")} />
                  </div>

                  <div className="space-y-1.5">
                      <Label className={labelCls}>Empresa</Label>
                      <Input name="company" defaultValue={editingClient?.company || ""} placeholder="Ex: Studio Design" className={inputCls} />
                  </div>

                  {/* Vínculo com Conexões */}
                  <div className="space-y-1.5">
                      <Label className={labelCls}>Contato (das Conexões)</Label>
                      <Select value={friendId} onValueChange={setFriendId}>
                          <SelectTrigger className={inputCls}>
                              <SelectValue placeholder="Vincular uma pessoa..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl z-[100] max-h-64">
                              <SelectItem value={NO_FRIEND}>Sem vínculo</SelectItem>
                              {friends.map(f => (
                                <SelectItem key={f.id} value={f.id}>
                                  {f.name}{f.company ? ` · ${f.company}` : ""}
                                </SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                      {linkedFriend && (
                        <p className="text-[9px] text-muted-foreground px-1">A foto e os dados de <strong>{linkedFriend.name}</strong> aparecerão no card.</p>
                      )}
                      {friends.length === 0 && (
                        <p className="text-[9px] text-muted-foreground px-1">Cadastre Conexões em /social para vincular.</p>
                      )}
                  </div>
                </div>

                {/* COLUNA DIREITA: Contato & Documentos */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                      <Label className={labelCls}>WhatsApp</Label>
                      <Input
                        name="phone_display"
                        value={phoneValue}
                        onChange={(e) => setPhoneValue(maskPhone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className={cn(inputCls, "font-mono")}
                      />
                  </div>

                  <div className="space-y-1.5">
                      <Label className={labelCls}>Email</Label>
                      <Input name="email" type="email" defaultValue={editingClient?.email || ""} placeholder="contato@email.com" className={inputCls} />
                  </div>

                  <div className="space-y-1.5">
                      <Label className={labelCls}>CPF / CNPJ</Label>
                      <Input name="document" defaultValue={editingClient?.document || ""} placeholder="000.000.000-00" className={inputCls} />
                  </div>

                  <div className="space-y-1.5">
                      <Label className={labelCls}>Website</Label>
                      <Input name="website" defaultValue={editingClient?.website || ""} placeholder="empresa.com" className={cn(inputCls, "font-mono text-xs")} />
                  </div>

                  <div className="space-y-1.5">
                      <Label className={labelCls}>Endereço</Label>
                      <Input name="address" defaultValue={editingClient?.address || ""} placeholder="Rua, bairro, cidade..." className={inputCls} />
                  </div>
                </div>

                {/* Anotações (largura total) */}
                <div className="space-y-1.5 md:col-span-2">
                    <Label className={labelCls}>Anotações</Label>
                    <Textarea name="notes" defaultValue={editingClient?.notes || ""} placeholder="Detalhes do cliente, histórico, observações..." className="rounded-xl bg-muted/20 border-border/40 resize-none h-20 p-3 text-sm" />
                </div>
              </DialogBody>

              <DialogFooter>
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancelar</Button>
                  <SubmitButton className="rounded-xl px-8 font-bold shadow-lg shadow-primary/20">
                    {editingClient ? "Salvar Alterações" : "Cadastrar Cliente"}
                  </SubmitButton>
              </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Modal Novo Contrato ---
interface BillingModalProps {
  clientId: string | null;
  onClose: () => void;
}

export function BillingModal({ clientId, onClose }: BillingModalProps) {
  const symbol = useCurrencySymbol();
  return (
    <Dialog open={!!clientId} onOpenChange={onClose}>
      <DialogContent size="md">
          <DialogHeader
            icon={<FileText className="h-5 w-5" />}
            title="Novo Contrato"
            description="Defina o valor total e as parcelas."
          />
          <form action={async (fd) => {
              const res = await createBilling(fd) as ActionResponse;
              if(res.success) {
                  toast.success(res.message);
                  onClose();
              } else {
                  toast.error(res.message);
              }
          }} className="flex flex-col flex-1 min-h-0">
              <input type="hidden" name="clientId" value={clientId || ""} />
              <DialogBody className="space-y-5">

              <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Serviço ou Projeto</Label>
                  <Input name="title" required placeholder="Ex: Consultoria Mensal" className="rounded-xl h-12 bg-muted/20" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Valor Total</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">{symbol}</span>
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

              </DialogBody>

              <DialogFooter>
                  <SubmitButton className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20">Gerar Faturas</SubmitButton>
              </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Modal Ajustar Fatura ---
interface InvoiceModalProps {
  invoice: InvoiceData | null;
  onClose: () => void;
}

export function InvoiceModal({ invoice, onClose }: InvoiceModalProps) {
  return (
    <Dialog open={!!invoice} onOpenChange={onClose}>
      <DialogContent size="md">
          <DialogHeader
            icon={<Receipt className="h-5 w-5" />}
            title="Ajustar Fatura"
            description="Modifique valores ou data desta parcela específica."
          />
          <form action={async (fd) => {
              const res = await updateInvoice(fd) as ActionResponse;
              if(res.success){
                  toast.success(res.message);
                  onClose();
              } else {
                  toast.error(res.message);
              }
          }} className="flex flex-col flex-1 min-h-0">
              <input type="hidden" name="id" value={invoice?.id || ""} />
              <DialogBody className="space-y-5">

              <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Descrição</Label>
                  <Input name="title" defaultValue={invoice?.title} required className="rounded-xl h-12 bg-muted/20 font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Valor Parcela</Label>
                      <Input type="number" step="0.01" name="value" defaultValue={invoice?.value} required className="rounded-xl h-12 bg-muted/20 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Vencimento</Label>
                      <Input
                          type="date"
                          name="dueDate"
                          defaultValue={invoice?.dueDate ? toInputDate(invoice.dueDate) : ""}
                          required
                          className="rounded-xl h-12 bg-muted/20"
                      />
                  </div>
              </div>

              <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Link de pagamento <span className="font-medium normal-case tracking-normal">(boleto / checkout — opcional)</span></Label>
                  <Input
                    name="linkUrl"
                    type="url"
                    placeholder="https://..."
                    defaultValue={invoice?.linkUrl ?? ""}
                    className="rounded-xl h-12 bg-muted/20 font-mono text-xs"
                  />
                  <p className="ml-1 text-[10px] text-muted-foreground">Vai junto na mensagem de cobrança do WhatsApp e fica clicável na lista.</p>
              </div>

              <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Status de Pagamento</Label>
                  <Select name="status" defaultValue={invoice?.status || "PENDING"}>
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

              {/* Tags, Anexos & Conexões — ex.: anexar o comprovante/boleto desta fatura. */}
              {invoice && (
                <div className="pt-2">
                  <EntityConnections entityType="invoice" entityId={invoice.id} />
                </div>
              )}

              </DialogBody>

              <DialogFooter className="flex flex-col gap-3">
                  <SubmitButton className="w-full h-12 rounded-xl font-bold">Salvar Ajuste</SubmitButton>
                  {invoice?.status === 'PAID' && invoice?.paidAt && (
                      <p className="text-[10px] text-center text-emerald-600 font-bold uppercase tracking-widest">
                        Recebido em {new Date(invoice.paidAt).toLocaleDateString('pt-BR')}
                      </p>
                  )}
              </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Modal Editar Contrato ---
interface BillingEditModalProps {
  billing: BillingData | null;
  onClose: () => void;
}

export function BillingEditModal({ billing, onClose }: BillingEditModalProps) {
  return (
    <Dialog open={!!billing} onOpenChange={onClose}>
      <DialogContent size="md">
          <DialogHeader
            icon={<FileText className="h-5 w-5" />}
            title="Editar Contrato"
            description="Mude o status geral deste projeto."
          />
          <form action={async (fd) => {
              const res = await updateBilling(fd) as ActionResponse;
              if(res.success){
                  toast.success(res.message);
                  onClose();
              } else {
                  toast.error(res.message);
              }
          }} className="flex flex-col flex-1 min-h-0">
              <input type="hidden" name="id" value={billing?.id || ""} />
              <DialogBody className="space-y-5">

              <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Título do Serviço</Label>
                  <Input name="title" defaultValue={billing?.title} required className="rounded-xl h-12 bg-muted/20" />
              </div>

              <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Status do Projeto</Label>
                  <Select name="status" defaultValue={billing?.status || "ACTIVE"}>
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

              </DialogBody>

              <DialogFooter>
                  <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>Cancelar</Button>
                  <SubmitButton className="rounded-xl px-8 font-bold">Salvar</SubmitButton>
              </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Modal Receber (lança no Financeiro) ---
interface PaymentModalProps {
  invoice: InvoiceData | null;
  accounts: AccountOption[];
  onClose: () => void;
}

export function PaymentModal({ invoice, accounts, onClose }: PaymentModalProps) {
  const formatCurrency = useFormatCurrency();
  // Pré-seleciona a primeira conta não automática (ou a primeira disponível).
  // O pai usa key={invoice?.id} para remontar e recalcular o default por fatura.
  const [accountId, setAccountId] = useState<string>(
    () => (accounts.find(a => !a.isConnected) || accounts[0])?.id || ""
  );

  const hasAccounts = accounts.length > 0;

  return (
    <Dialog open={!!invoice} onOpenChange={onClose}>
      <DialogContent size="md">
          <DialogHeader
            icon={<Wallet className="h-5 w-5" />}
            iconClassName="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            title="Registrar Recebimento"
            description={<>A entrada de <strong className="text-emerald-600">{invoice ? formatCurrency(invoice.value) : ""}</strong> será lançada como receita na conta escolhida.</>}
          />

          {hasAccounts ? (
            <form action={async (fd) => {
                fd.set("invoiceId", invoice?.id || "");
                fd.set("accountId", accountId);
                const res = await receiveInvoicePayment(fd) as ActionResponse;
                if (res.success) {
                    toast.success(res.message);
                    onClose();
                } else {
                    toast.error(res.message);
                }
            }} className="flex flex-col flex-1 min-h-0">
                <DialogBody className="space-y-5">
                <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Conta de Destino</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger className="rounded-xl h-12 bg-muted/20">
                            <SelectValue placeholder="Selecione a conta..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl z-[100]">
                            {accounts.map(acc => (
                              <SelectItem key={acc.id} value={acc.id}>
                                <span className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: acc.color || "#6366f1" }} />
                                  {acc.name}{acc.isConnected ? " (automática)" : ""}
                                </span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                </DialogBody>

                <DialogFooter>
                    <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>Cancelar</Button>
                    <SubmitButton className="rounded-xl px-8 font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                      Confirmar Recebimento
                    </SubmitButton>
                </DialogFooter>
            </form>
          ) : (
            <>
              <DialogBody>
                <p className="text-sm text-muted-foreground">
                  Você ainda não tem nenhuma conta cadastrada no Financeiro. Crie uma conta em <strong>/finance</strong> para registrar recebimentos.
                </p>
              </DialogBody>
              <DialogFooter>
                <Button type="button" variant="ghost" className="rounded-xl" onClick={onClose}>Fechar</Button>
              </DialogFooter>
            </>
          )}
      </DialogContent>
    </Dialog>
  );
}

// --- Modal Nova Parcela (fatura avulsa num contrato existente) ---
interface AddInvoiceModalProps {
  /** Contrato alvo (null = fechado). */
  billing: { id: string; title: string } | null;
  onClose: () => void;
}

export function AddInvoiceModal({ billing, onClose }: AddInvoiceModalProps) {
  const currencySymbol = useCurrencySymbol();
  return (
    <Dialog open={!!billing} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader
          icon={<Receipt className="h-5 w-5" />}
          title="Nova Parcela"
          description={billing ? `Adicionar fatura avulsa em "${billing.title}" (aditivo, hora extra, ajuste).` : ""}
        />
        <form action={async (fd) => {
          const res = await addInvoice(fd) as ActionResponse;
          if (res.success) {
            toast.success(res.message);
            onClose();
          } else {
            toast.error(res.message);
          }
        }} className="flex flex-col flex-1 min-h-0">
          <input type="hidden" name="billingId" value={billing?.id || ""} />
          <DialogBody className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Descrição</Label>
              <Input name="title" placeholder="Ex: Aditivo — nova página" required className="rounded-xl h-12 bg-muted/20 font-medium" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Valor ({currencySymbol})</Label>
                <Input type="number" step="0.01" min="0.01" name="value" placeholder="0,00" required className="rounded-xl h-12 bg-muted/20 font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-muted-foreground ml-1">Vencimento</Label>
                <Input type="date" name="dueDate" required className="rounded-xl h-12 bg-muted/20" />
              </div>
            </div>

            <p className="rounded-xl border border-dashed border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground">
              O total e o nº de parcelas do contrato são resincronizados automaticamente.
            </p>
          </DialogBody>

          <DialogFooter>
            <SubmitButton className="w-full h-12 rounded-xl font-bold">Adicionar Parcela</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Alerta de Exclusão ---
interface DeleteAlertProps {
  target: DeleteTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAlert({ target, onClose, onConfirm }: DeleteAlertProps) {
  return (
    <AlertDialog open={!!target} onOpenChange={onClose}>
      <AlertDialogContent
        className={cn(
          // z-[110]: SEMPRE acima do overlay (z-[100]) — z-50 deixava o vidro
          // desfocado NA FRENTE da caixa de confirmação (modal "fantasma").
          "fixed left-[50%] top-[50%] z-[110] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
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
            Você está prestes a remover <strong className="text-foreground break-all">{target?.name}</strong>.
            <span className="block mt-2">
              {target?.type === 'CLIENT'
                ? "Esta ação é irreversível e apagará todos os contratos, faturas e o histórico financeiro deste cliente no sistema."
                : target?.type === 'INVOICE'
                  ? "Esta parcela será removida do contrato (o total é resincronizado). Se já estava paga, a receita lançada no Financeiro é estornada."
                  : "Esta ação removerá permanentemente este projeto e todas as parcelas/faturas vinculadas a ele."}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-3">
          <AlertDialogCancel className="rounded-xl h-12 font-bold border-border/60 hover:bg-muted transition-all sm:flex-1">
            Manter Dados
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-12 font-bold px-8 shadow-lg shadow-destructive/20 transition-all sm:flex-1"
          >
            Sim, Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
