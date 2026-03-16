'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// 1. Criar Novo Cliente
export async function createClient(formData: FormData) {
  try {
    const name = (formData.get("name") as string)?.trim()
    const company = (formData.get("company") as string)?.trim()
    const phone = (formData.get("phone") as string)?.trim()
    const document = (formData.get("document") as string)?.trim()

    if (!name) return { success: false, message: "O nome do cliente é obrigatório." }

    await prisma.client.create({
      data: {
        name,
        company: company || null,
        phone: phone || null,
        document: document || null,
        status: "ACTIVE"
      }
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
    const company = (formData.get("company") as string)?.trim()
    const phone = (formData.get("phone") as string)?.trim()
    const document = (formData.get("document") as string)?.trim()

    if (!id || !name) return { success: false, message: "ID e Nome são obrigatórios." }

    await prisma.client.update({
      where: { id },
      data: {
        name,
        company: company || null,
        phone: phone || null,
        document: document || null,
      }
    })

    revalidatePath("/business")
    return { success: true, message: "Cliente atualizado com sucesso!" }
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    return { success: false, message: "Falha ao atualizar cliente." }
  }
}

// 3. Deletar Cliente
export async function deleteClient(clientId: string) {
  try {
    if (!clientId) return { success: false, message: "ID do cliente não fornecido." }

    await prisma.client.delete({
      where: { id: clientId }
    })
    
    revalidatePath("/business")
    return { success: true, message: "Cliente excluído permanentemente." }
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
        status: "PENDING"
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

    await prisma.billing.update({
      where: { id },
      data: { title, status }
    })

    revalidatePath("/business")
    return { success: true, message: "Status do contrato atualizado!" }
  } catch (error) {
    console.error("Erro ao atualizar contrato:", error)
    return { success: false, message: "Falha ao atualizar contrato." }
  }
}

// 6. Deletar Contrato/Cobrança
export async function deleteBilling(billingId: string) {
  try {
    if (!billingId) return { success: false, message: "ID não fornecido." }

    await prisma.billing.delete({
      where: { id: billingId }
    })
    revalidatePath("/business")
    return { success: true, message: "Contrato removido com sucesso." }
  } catch (error) {
    console.error("Erro ao deletar cobrança:", error)
    return { success: false, message: "Falha ao excluir o contrato." }
  }
}

// 7. Marcar Fatura Exata como Paga (Rápido)
export async function markInvoiceAsPaid(invoiceId: string) {
  try {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "PAID",
        paidAt: new Date()
      }
    })
    revalidatePath("/business")
    return { success: true, message: "Pagamento registrado com sucesso!" }
  } catch (error) {
    console.error("Erro ao marcar fatura como paga:", error)
    return { success: false, message: "Falha ao registrar pagamento." }
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

    // 🟢 MAGIA: Busca a fatura original para não sobrescrever o dia que o cara pagou
    const existingInvoice = await prisma.invoice.findUnique({ where: { id } })

    // 🟢 CORREÇÃO DO TYPESCRIPT: Removemos o "any" e definimos o tipo exato
    const dataToUpdate: {
      title: string;
      value: number;
      dueDate: Date;
      status: string;
      paidAt?: Date | null;
    } = { title, value, dueDate, status }
    
    if (status === "PAID") {
        // Se ela já estava paga, mantém a data antiga. Se foi marcada como paga agora, usa a data de hoje.
        dataToUpdate.paidAt = existingInvoice?.status === "PAID" ? existingInvoice.paidAt : new Date()
    } else {
        dataToUpdate.paidAt = null
    }

    // Atualiza a fatura
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: dataToUpdate
    })

    // Sincroniza o total do contrato pai
    const allInvoices = await prisma.invoice.findMany({
      where: { billingId: updatedInvoice.billingId },
      select: { value: true }
    })
    const newTotalValue = allInvoices.reduce((sum, inv) => sum + Number(inv.value), 0)

    await prisma.billing.update({
      where: { id: updatedInvoice.billingId },
      data: { totalValue: newTotalValue }
    })

    revalidatePath("/business")
    return { success: true, message: "Fatura ajustada com sucesso!" }
  } catch (error) {
    console.error("Erro ao atualizar fatura:", error)
    return { success: false, message: "Falha ao ajustar a fatura." }
  }
}