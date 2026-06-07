'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notifications"

// Lê um campo do FormData, normaliza vazio para null.
function field(formData: FormData, key: string): string | null {
  const value = (formData.get(key) as string)?.trim()
  return value ? value : null
}

// Resolve o vínculo com uma Conexão (Friend), garantindo que pertence ao usuário.
async function resolveFriendId(formData: FormData, userId: string): Promise<string | null> {
  const friendId = field(formData, "friendId")
  if (!friendId) return null
  const owned = await prisma.friend.findFirst({ where: { id: friendId, userId }, select: { id: true } })
  return owned ? friendId : null
}

// 1. Criar Novo Cliente
export async function createClient(formData: FormData) {
  try {
    const name = (formData.get("name") as string)?.trim()
    if (!name) return { success: false, message: "O nome do cliente é obrigatório." }

    const userId = await requireUserId()
    const friendId = await resolveFriendId(formData, userId)

    const created = await prisma.client.create({
      data: {
        name,
        company: field(formData, "company"),
        imageUrl: field(formData, "imageUrl"),
        website: field(formData, "website"),
        phone: field(formData, "phone"),
        email: field(formData, "email"),
        document: field(formData, "document"),
        address: field(formData, "address"),
        notes: field(formData, "notes"),
        friendId,
        status: "ACTIVE",
        userId
      }
    })

    await logActivity({
      action: "CREATE",
      module: "business",
      entityType: "client",
      entityId: created.id,
      summary: `Cadastrou o cliente "${created.name}"`,
    })

    revalidatePath("/business")
    return { success: true, message: "Cliente cadastrado com sucesso!" }
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return { success: false, message: "Falha ao criar cliente." }
  }
}

// 2. Atualizar Cliente
export async function updateClient(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const name = (formData.get("name") as string)?.trim()

    if (!id || !name) return { success: false, message: "ID e Nome são obrigatórios." }

    const userId = await requireUserId()
    const friendId = await resolveFriendId(formData, userId)

    await prisma.client.updateMany({
      where: { id, userId },
      data: {
        name,
        company: field(formData, "company"),
        imageUrl: field(formData, "imageUrl"),
        website: field(formData, "website"),
        phone: field(formData, "phone"),
        email: field(formData, "email"),
        document: field(formData, "document"),
        address: field(formData, "address"),
        notes: field(formData, "notes"),
        friendId,
      }
    })

    revalidatePath("/business")
    return { success: true, message: "Cliente atualizado com sucesso!" }
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    return { success: false, message: "Falha ao atualizar cliente." }
  }
}

// 3. Deletar Cliente (Soft-delete → Lixeira)
// Os contratos/faturas vinculados permanecem no banco; ao restaurar o cliente,
// voltam a aparecer. A exclusão definitiva (cascata) acontece na /trash.
export async function deleteClient(clientId: string) {
  try {
    if (!clientId) return { success: false, message: "ID do cliente não fornecido." }

    const userId = await requireUserId()

    const client = await prisma.client.findFirst({ where: { id: clientId, userId }, select: { name: true } })
    await prisma.client.updateMany({
      where: { id: clientId, userId },
      data: { deletedAt: new Date() }
    })

    await logActivity({
      action: "DELETE",
      module: "business",
      entityType: "client",
      entityId: clientId,
      summary: client ? `Moveu o cliente "${client.name}" para a lixeira` : "Removeu um cliente",
    })

    revalidatePath("/business")
    return { success: true, message: "Cliente movido para a lixeira." }
  } catch (error) {
    console.error("Erro ao deletar cliente:", error)
    return { success: false, message: "Falha ao deletar cliente. Verifique as dependências." }
  }
}

// 4. Criar Cobrança/Contrato
export async function createBilling(formData: FormData) {
  try {
    const clientId = formData.get("clientId") as string
    const title = (formData.get("title") as string)?.trim()
    const totalValue = parseFloat(formData.get("totalValue") as string) || 0
    const installments = parseInt(formData.get("installments") as string) || 1
    const startDateStr = formData.get("startDate") as string
    const interval = formData.get("interval") as string || "MONTHLY" 
    
    if (!clientId || !title) return { success: false, message: "Cliente e Título são obrigatórios." }

    const userId = await requireUserId()

    // Garante que o cliente pertence ao usuário logado
    const ownedClient = await prisma.client.findFirst({ where: { id: clientId, userId }, select: { id: true } })
    if (!ownedClient) return { success: false, message: "Cliente não encontrado." }

    const datePart = startDateStr ? startDateStr.split('T')[0] : new Date().toISOString().split('T')[0]
    const startDate = new Date(`${datePart}T12:00:00Z`)
    const installmentValue = totalValue / installments
    const invoicesToCreate = []

    for (let i = 0; i < installments; i++) {
      const dueDate = new Date(startDate)
      if (interval === "ANNUAL") {
          dueDate.setFullYear(dueDate.getFullYear() + i)
      } else {
          dueDate.setMonth(dueDate.getMonth() + i)
      }

      invoicesToCreate.push({
        title: installments === 1
          ? "Pagamento Único"
          : (interval === "ANNUAL" ? `Anuidade ${dueDate.getFullYear()}` : `Parcela ${i + 1}/${installments}`),
        value: installmentValue,
        dueDate: dueDate,
        status: "PENDING",
        userId
      })
    }

    await prisma.billing.create({
      data: {
        clientId,
        title,
        totalValue,
        installments,
        type: interval === "ANNUAL" ? "RECURRING" : (installments > 1 ? "INSTALLMENT" : "ONE_OFF"),
        startDate,
        userId,
        invoices: {
          create: invoicesToCreate
        }
      }
    })

    revalidatePath("/business")
    return { success: true, message: "Contrato e faturas gerados com sucesso!" }
  } catch (error) {
    console.error("Erro ao criar contrato:", error)
    return { success: false, message: "Falha ao criar contrato e faturas." }
  }
}

// 5. Editar Contrato (Apenas dados gerais)
export async function updateBilling(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const title = (formData.get("title") as string)?.trim()
    const status = formData.get("status") as string

    if (!id || !title) return { success: false, message: "Dados inválidos para atualizar contrato." }

    const userId = await requireUserId()

    await prisma.billing.updateMany({
      where: { id, userId },
      data: { title, status }
    })

    revalidatePath("/business")
    return { success: true, message: "Status do contrato atualizado!" }
  } catch (error) {
    console.error("Erro ao atualizar contrato:", error)
    return { success: false, message: "Falha ao atualizar contrato." }
  }
}

// 5.1. Marcar contrato como "cobrado agora" (Central de Cobranças)
export async function markBillingReminded(billingId: string) {
  try {
    if (!billingId) return { success: false, message: "ID não fornecido." }
    const userId = await requireUserId()
    await prisma.billing.updateMany({
      where: { id: billingId, userId },
      data: { lastRemindedAt: new Date() },
    })
    revalidatePath("/business")
    return { success: true, message: "Cobrança registrada." }
  } catch (error) {
    console.error("Erro ao registrar lembrete:", error)
    return { success: false, message: "Falha ao registrar a cobrança." }
  }
}

// 6. Deletar Contrato/Cobrança
export async function deleteBilling(billingId: string) {
  try {
    if (!billingId) return { success: false, message: "ID não fornecido." }

    const userId = await requireUserId()

    await prisma.billing.deleteMany({
      where: { id: billingId, userId }
    })
    revalidatePath("/business")
    return { success: true, message: "Contrato removido com sucesso." }
  } catch (error) {
    console.error("Erro ao deletar cobrança:", error)
    return { success: false, message: "Falha ao excluir o contrato." }
  }
}

// 7. Receber Fatura: marca como paga E lança a receita no Financeiro (conta escolhida).
export async function receiveInvoicePayment(formData: FormData) {
  try {
    const invoiceId = formData.get("invoiceId") as string
    const accountId = formData.get("accountId") as string
    if (!invoiceId || !accountId) return { success: false, message: "Fatura e conta são obrigatórias." }

    const userId = await requireUserId()

    let receipt: { title: string; value: number; client: string } | null = null

    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, userId },
        include: { billing: { include: { client: { select: { name: true } } } } },
      })
      if (!invoice) throw new Error("Fatura não encontrada.")
      // Idempotência: já recebida se tem transação vinculada OU já está PAID (contas
      // conectadas marcam PAID sem transação — ver abaixo).
      if (invoice.transactionId || invoice.status === "PAID") throw new Error("Esta fatura já foi recebida.")

      const account = await tx.account.findFirst({ where: { id: accountId, userId } })
      if (!account) throw new Error("Conta não encontrada.")

      const value = Number(invoice.value)
      const clientName = invoice.billing.client?.name || "Cliente"

      // Conta CONECTADA (Pluggy): NÃO criamos a transação manual — o Pluggy importa a
      // entrada real do banco e duplicaria o lançamento (a descrição difere, então o
      // dedup do sync não a reconhece). Em conta comum, lançamos a receita e somamos o saldo.
      let transactionId: string | null = null
      if (!account.isConnected) {
        const transaction = await tx.transaction.create({
          data: {
            description: `${clientName} — ${invoice.title}`,
            amount: value,
            type: "INCOME",
            category: "Recebimento",
            accountId,
            date: new Date(),
            userId,
          },
        })
        transactionId = transaction.id
        await tx.account.update({
          where: { id: account.id },
          data: { balance: Number(account.balance) + value },
        })
      }

      await tx.invoice.updateMany({
        where: { id: invoiceId, userId },
        data: { status: "PAID", paidAt: new Date(), transactionId },
      })

      receipt = { title: invoice.title, value, client: clientName }
    })

    if (receipt) {
      const r = receipt as { title: string; value: number; client: string }
      await logActivity({
        action: "INCOME",
        module: "business",
        entityType: "invoice",
        entityId: invoiceId,
        summary: `Recebeu "${r.title}" de ${r.client}`,
        meta: { value: r.value },
      })
      await notify({
        type: "INVOICE_PAID",
        title: `Recebimento de ${r.client}`,
        body: `${r.title} — registrado no Financeiro`,
        entityType: "invoice",
        entityId: invoiceId,
        actionUrl: "/business",
      })
    }

    revalidatePath("/business")
    revalidatePath("/finance")
    return { success: true, message: "Recebimento registrado no Financeiro!" }
  } catch (error) {
    console.error("Erro ao receber fatura:", error)
    const message = error instanceof Error ? error.message : "Falha ao registrar recebimento."
    return { success: false, message }
  }
}

// 8. Editar Fatura Específica (Com SINCRONIZAÇÃO E SEGURANÇA DE DATA)
export async function updateInvoice(formData: FormData) {
  try {
    const id = formData.get("id") as string
    const title = (formData.get("title") as string)?.trim()
    const value = parseFloat(formData.get("value") as string) || 0
    const dueDateStr = formData.get("dueDate") as string
    const status = formData.get("status") as string
    
    if (!id || !title) return { success: false, message: "Fatura inválida." }

    const datePart = dueDateStr.split('T')[0]
    const dueDate = new Date(`${datePart}T12:00:00Z`)

    const userId = await requireUserId()

    let billingId = ""

    await prisma.$transaction(async (tx) => {
      // 🟢 Busca a fatura original (escopada) para não sobrescrever o dia que o cara pagou
      const existingInvoice = await tx.invoice.findFirst({ where: { id, userId } })
      if (!existingInvoice) throw new Error("Fatura não encontrada.")
      billingId = existingInvoice.billingId

      // 🟢 Sem "any": tipo exato dos campos atualizados
      const dataToUpdate: {
        title: string;
        value: number;
        dueDate: Date;
        status: string;
        paidAt?: Date | null;
        transactionId?: string | null;
      } = { title, value, dueDate, status }

      if (status === "PAID") {
        // Se já estava paga, mantém a data antiga; senão, usa hoje.
        dataToUpdate.paidAt = existingInvoice.status === "PAID" ? existingInvoice.paidAt : new Date()
      } else {
        dataToUpdate.paidAt = null
      }

      // --- Sincronização do lançamento financeiro vinculado ---
      if (existingInvoice.transactionId) {
        const linkedTx = await tx.transaction.findFirst({ where: { id: existingInvoice.transactionId, userId } })

        if (status !== "PAID") {
          // Estorno: remove a receita e reverte o saldo da conta.
          if (linkedTx) {
            const account = await tx.account.findFirst({ where: { id: linkedTx.accountId, userId } })
            if (account && !account.isConnected) {
              await tx.account.update({
                where: { id: account.id },
                data: { balance: Number(account.balance) - Number(linkedTx.amount) },
              })
            }
            await tx.transaction.delete({ where: { id: linkedTx.id } })
          }
          dataToUpdate.transactionId = null
        } else if (linkedTx && Number(linkedTx.amount) !== value) {
          // Continua paga, mas o valor mudou: ajusta a transação e o saldo pela diferença.
          const delta = value - Number(linkedTx.amount)
          const account = await tx.account.findFirst({ where: { id: linkedTx.accountId, userId } })
          if (account && !account.isConnected) {
            await tx.account.update({
              where: { id: account.id },
              data: { balance: Number(account.balance) + delta },
            })
          }
          await tx.transaction.update({ where: { id: linkedTx.id }, data: { amount: value } })
        }
      }

      // Atualiza a fatura (escopada ao usuário)
      await tx.invoice.updateMany({ where: { id, userId }, data: dataToUpdate })

      // Sincroniza o total do contrato pai
      const allInvoices = await tx.invoice.findMany({ where: { billingId, userId }, select: { value: true } })
      const newTotalValue = allInvoices.reduce((sum, inv) => sum + Number(inv.value), 0)
      await tx.billing.updateMany({ where: { id: billingId, userId }, data: { totalValue: newTotalValue } })
    })

    revalidatePath("/business")
    revalidatePath("/finance")
    return { success: true, message: "Fatura ajustada com sucesso!" }
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error)
    return { success: false, message: "Falha ao ajustar a fatura." }
  }
}