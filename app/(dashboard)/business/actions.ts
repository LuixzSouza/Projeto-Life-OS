'use server'

import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireUserId } from "@/lib/auth"
import { logActivity } from "@/lib/activity"
import { notify } from "@/lib/notifications"

// ⚠️ REGRA DESTE MÓDULO (modo réplica/Turso): NÃO ler colunas DateTime dentro de
// $transaction interativa. Em réplica, leituras dentro da transação vão ao
// PRIMÁRIO (Turso/hrana), onde datas gravadas como INTEGER (ms) estouram a
// conversão do Prisma ("Could not convert value ... to type DateTime").
// Padrão seguro: ler ANTES com prisma normal (réplica local lê inteiro numa boa)
// e escrever em lote via prisma.$transaction([...]) com select: { id: true }.

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

    // Leituras FORA da transação (ver regra no topo do módulo) — só campos sem data.
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: {
        id: true, title: true, value: true, status: true, transactionId: true,
        billing: { select: { client: { select: { name: true } } } },
      },
    })
    if (!invoice) return { success: false, message: "Fatura não encontrada." }
    // Idempotência: já recebida se tem transação vinculada OU já está PAID (contas
    // conectadas marcam PAID sem transação — ver abaixo).
    if (invoice.transactionId || invoice.status === "PAID") {
      return { success: false, message: "Esta fatura já foi recebida." }
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, isConnected: true, balance: true },
    })
    if (!account) return { success: false, message: "Conta não encontrada." }

    const value = Number(invoice.value)
    const clientName = invoice.billing.client?.name || "Cliente"

    // Conta CONECTADA (Pluggy): NÃO criamos a transação manual — o Pluggy importa a
    // entrada real do banco e duplicaria o lançamento (a descrição difere, então o
    // dedup do sync não a reconhece). Em conta comum, lançamos a receita e somamos o saldo.
    // Escritas em LOTE atômico; id da transação gerado aqui p/ vincular na fatura.
    const ops = []
    let transactionId: string | null = null
    if (!account.isConnected) {
      transactionId = randomUUID()
      ops.push(
        prisma.transaction.create({
          data: {
            id: transactionId,
            description: `${clientName} — ${invoice.title}`,
            amount: value,
            type: "INCOME",
            category: "Recebimento",
            accountId,
            date: new Date(),
            userId,
          },
          select: { id: true },
        }),
        prisma.account.update({
          where: { id: account.id },
          data: { balance: Number(account.balance) + value },
          select: { id: true },
        }),
      )
    }
    ops.push(
      prisma.invoice.updateMany({
        where: { id: invoiceId, userId },
        data: { status: "PAID", paidAt: new Date(), transactionId },
      }),
    )
    await prisma.$transaction(ops)

    const receipt = { title: invoice.title, value, client: clientName }

    if (receipt) {
      const r = receipt
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

    // Leitura FORA da transação (regra do topo): só campos sem data. O paidAt
    // antigo nem é lido — se a fatura continua paga, simplesmente não tocamos nele.
    const existingInvoice = await prisma.invoice.findFirst({
      where: { id, userId },
      select: { id: true, status: true, transactionId: true, billingId: true },
    })
    if (!existingInvoice) return { success: false, message: "Fatura não encontrada." }
    const billingId = existingInvoice.billingId

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
      // Se já estava paga, NÃO toca no paidAt (mantém a data original); senão, hoje.
      if (existingInvoice.status !== "PAID") dataToUpdate.paidAt = new Date()
    } else {
      dataToUpdate.paidAt = null
    }

    // --- Sincronização do lançamento financeiro vinculado (escritas em lote) ---
    const ops = []
    if (existingInvoice.transactionId) {
      const linkedTx = await prisma.transaction.findFirst({
        where: { id: existingInvoice.transactionId, userId },
        select: { id: true, amount: true, accountId: true },
      })

      if (status !== "PAID") {
        // Estorno: remove a receita e reverte o saldo da conta.
        if (linkedTx) {
          const account = await prisma.account.findFirst({
            where: { id: linkedTx.accountId, userId },
            select: { id: true, isConnected: true, balance: true },
          })
          if (account && !account.isConnected) {
            ops.push(prisma.account.update({
              where: { id: account.id },
              data: { balance: Number(account.balance) - Number(linkedTx.amount) },
              select: { id: true },
            }))
          }
          ops.push(prisma.transaction.delete({ where: { id: linkedTx.id }, select: { id: true } }))
        }
        dataToUpdate.transactionId = null
      } else if (linkedTx && Number(linkedTx.amount) !== value) {
        // Continua paga, mas o valor mudou: ajusta a transação e o saldo pela diferença.
        const delta = value - Number(linkedTx.amount)
        const account = await prisma.account.findFirst({
          where: { id: linkedTx.accountId, userId },
          select: { id: true, isConnected: true, balance: true },
        })
        if (account && !account.isConnected) {
          ops.push(prisma.account.update({
            where: { id: account.id },
            data: { balance: Number(account.balance) + delta },
            select: { id: true },
          }))
        }
        ops.push(prisma.transaction.update({ where: { id: linkedTx.id }, data: { amount: value }, select: { id: true } }))
      }
    }

    // Atualiza a fatura (escopada ao usuário) no mesmo lote atômico.
    ops.push(prisma.invoice.updateMany({ where: { id, userId }, data: dataToUpdate }))
    await prisma.$transaction(ops)

    // Sincroniza o total do contrato pai (canceladas não contam).
    const allInvoices = await prisma.invoice.findMany({
      where: { billingId, userId, status: { not: "CANCELED" } },
      select: { value: true },
    })
    const newTotalValue = allInvoices.reduce((sum, inv) => sum + Number(inv.value), 0)
    await prisma.billing.updateMany({
      where: { id: billingId, userId },
      data: { totalValue: newTotalValue, installments: allInvoices.length },
    })

    revalidatePath("/business")
    revalidatePath("/finance")
    return { success: true, message: "Fatura ajustada com sucesso!" }
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error)
    return { success: false, message: "Falha ao ajustar a fatura." }
  }
}

// 9. Excluir Fatura específica (parcela). Se estava PAGA com lançamento vinculado,
// estorna a receita do Financeiro e reverte o saldo da conta antes de apagar.
//
// ⚠️ Faturas de COBRANÇA RECORRENTE ativa no mês atual não podem ser apagadas de
// verdade: o syncRecurringChargeInvoices (que roda ao abrir Negócios/Finanças)
// recriaria a fatura na hora — era o bug do "excluí mas voltou". Para essas, a
// fatura vira CANCELED (lápide): a sync vê que o dia já tem fatura e não recria,
// e a UI esconde canceladas da lista.
export async function deleteInvoice(invoiceId: string) {
  try {
    if (!invoiceId) return { success: false, message: "ID não fornecido." }
    const userId = await requireUserId()

    let canceledInstead = false

    // Leituras FORA da transação (ver regra no topo do módulo).
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      select: { id: true, billingId: true, transactionId: true, dueDate: true },
    })
    if (!invoice) return { success: false, message: "Fatura não encontrada." }

    const ops = []

    // Estorno do lançamento financeiro vinculado (mesma lógica do updateInvoice).
    if (invoice.transactionId) {
      const linkedTx = await prisma.transaction.findFirst({
        where: { id: invoice.transactionId, userId },
        select: { id: true, amount: true, accountId: true },
      })
      if (linkedTx) {
        const account = await prisma.account.findFirst({
          where: { id: linkedTx.accountId, userId },
          select: { id: true, isConnected: true, balance: true },
        })
        if (account && !account.isConnected) {
          ops.push(prisma.account.update({
            where: { id: account.id },
            data: { balance: Number(account.balance) - Number(linkedTx.amount) },
            select: { id: true },
          }))
        }
        ops.push(prisma.transaction.delete({ where: { id: linkedTx.id }, select: { id: true } }))
      }
    }

    // A sync rematerializa ocorrências do MÊS ATUAL de cobranças recorrentes
    // ativas deste contrato. Se for o caso, cancela (lápide) em vez de apagar.
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    const activeCharge = invoice.dueDate >= monthStart && invoice.dueDate <= monthEnd
      ? await prisma.recurringCharge.findFirst({
          where: { userId, billingId: invoice.billingId, active: true },
          select: { id: true },
        })
      : null

    if (activeCharge) {
      canceledInstead = true
      ops.push(prisma.invoice.updateMany({
        where: { id: invoiceId, userId },
        data: { status: "CANCELED", paidAt: null, transactionId: null },
      }))
    } else {
      ops.push(prisma.invoice.deleteMany({ where: { id: invoiceId, userId } }))
    }
    await prisma.$transaction(ops)

    // Sincroniza o contrato pai (total/parcelas = somente faturas não canceladas).
    const remaining = await prisma.invoice.findMany({
      where: { billingId: invoice.billingId, userId, status: { not: "CANCELED" } },
      select: { value: true },
    })
    const newTotalValue = remaining.reduce((sum, inv) => sum + Number(inv.value), 0)
    await prisma.billing.updateMany({
      where: { id: invoice.billingId, userId },
      data: { totalValue: newTotalValue, installments: remaining.length },
    })

    revalidatePath("/business", "layout") // inclui a página de detalhe /business/[id]
    revalidatePath("/finance")
    return {
      success: true,
      message: canceledInstead
        ? "Fatura cancelada e oculta. Ela vem de uma cobrança recorrente ATIVA — para encerrar de vez, desative a cobrança recorrente em Finanças."
        : "Fatura excluída (contrato resincronizado).",
    }
  } catch (error) {
    console.error("Erro ao excluir fatura:", error)
    return { success: false, message: "Falha ao excluir a fatura." }
  }
}

// 10. Nova parcela/fatura avulsa em um contrato EXISTENTE (ex.: aditivo, hora extra).
export async function addInvoice(formData: FormData) {
  try {
    const billingId = formData.get("billingId") as string
    const title = (formData.get("title") as string)?.trim()
    const value = parseFloat(formData.get("value") as string) || 0
    const dueDateStr = formData.get("dueDate") as string

    if (!billingId || !title || !dueDateStr) return { success: false, message: "Título e vencimento são obrigatórios." }
    if (value <= 0) return { success: false, message: "Informe um valor maior que zero." }

    const userId = await requireUserId()
    const billing = await prisma.billing.findFirst({ where: { id: billingId, userId }, select: { id: true } })
    if (!billing) return { success: false, message: "Contrato não encontrado." }

    // Meio-dia UTC: evita o bug do "dia anterior" por fuso.
    const dueDate = new Date(`${dueDateStr.split("T")[0]}T12:00:00Z`)

    // Sem transação interativa (ver regra no topo do módulo): cria a parcela e
    // depois resincroniza o contrato pai (canceladas não contam).
    await prisma.invoice.create({
      data: { billingId, title, value, dueDate, status: "PENDING", userId },
      select: { id: true },
    })
    const all = await prisma.invoice.findMany({
      where: { billingId, userId, status: { not: "CANCELED" } },
      select: { value: true },
    })
    await prisma.billing.updateMany({
      where: { id: billingId, userId },
      data: {
        totalValue: all.reduce((sum, inv) => sum + Number(inv.value), 0),
        installments: all.length,
      },
    })

    revalidatePath("/business", "layout") // inclui a página de detalhe /business/[id]
    return { success: true, message: "Parcela adicionada ao contrato." }
  } catch (error) {
    console.error("Erro ao adicionar parcela:", error)
    return { success: false, message: "Falha ao adicionar a parcela." }
  }
}