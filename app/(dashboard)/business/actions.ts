'use server'

import { prisma } from "@/lib/prisma" // Ajuste o import conforme seu projeto
import { revalidatePath } from "next/cache"

// 1. Criar Novo Cliente
export async function createClient(formData: FormData) {
  const name = formData.get("name") as string
  const company = formData.get("company") as string
  const phone = formData.get("phone") as string
  const document = formData.get("document") as string

  await prisma.client.create({
    data: {
      name,
      company,
      phone,
      document,
      status: "ACTIVE"
    }
  })

  revalidatePath("/business")
}

// 2. Criar Cobrança (A MÁGICA ACONTECE AQUI)
export async function createBilling(formData: FormData) {
  const clientId = formData.get("clientId") as string
  const title = formData.get("title") as string
  const totalValue = parseFloat(formData.get("totalValue") as string)
  const installments = parseInt(formData.get("installments") as string) || 1
  const startDateStr = formData.get("startDate") as string
  
  const startDate = startDateStr ? new Date(startDateStr) : new Date()
  const installmentValue = totalValue / installments

  // Prepara as faturas (Invoices) para serem criadas
  const invoicesToCreate = []

  for (let i = 0; i < installments; i++) {
    const dueDate = new Date(startDate)
    // Adiciona 'i' meses à data inicial
    dueDate.setMonth(dueDate.getMonth() + i)

    invoicesToCreate.push({
      title: installments === 1 ? "Pagamento Único" : `Parcela ${i + 1}/${installments}`,
      value: installmentValue,
      dueDate: dueDate,
      status: "PENDING"
    })
  }

  // Cria o Billing Pai e as Invoices Filhas de uma vez (Transação implícita)
  await prisma.billing.create({
    data: {
      clientId,
      title,
      totalValue,
      installments,
      type: installments > 1 ? "INSTALLMENT" : "ONE_OFF",
      startDate,
      invoices: {
        create: invoicesToCreate
      }
    }
  })

  revalidatePath("/business")
}

// 3. Marcar Fatura como Paga
export async function markInvoiceAsPaid(invoiceId: string) {
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "PAID",
      paidAt: new Date()
    }
  })
  revalidatePath("/business")
}

// 4. Deletar Cliente (Limpeza)
export async function deleteClient(clientId: string) {
  await prisma.client.delete({
    where: { id: clientId }
  })
  revalidatePath("/business")
}

export async function updateClient(formData: FormData) {
  const id = formData.get("id") as string
  const name = formData.get("name") as string
  const company = formData.get("company") as string
  const phone = formData.get("phone") as string
  const document = formData.get("document") as string

  await prisma.client.update({
    where: { id },
    data: {
      name,
      company,
      phone,
      document,
    }
  })

  revalidatePath("/business")
}

// --- FUNÇÃO DELETAR CONTRATO/COBRANÇA ---
export async function deleteBilling(billingId: string) {
  try {
    await prisma.billing.delete({
      where: { id: billingId }
    })
    revalidatePath("/business")
  } catch (error) {
    console.error("Erro ao deletar cobrança:", error)
  }
}

// --- FUNÇÃO EDITAR CONTRATO (Título e Status) ---
export async function updateBilling(formData: FormData) {
  const id = formData.get("id") as string
  const title = formData.get("title") as string
  const status = formData.get("status") as string

  // Nota: Não editamos valores/parcelas aqui para não quebrar 
  // a lógica das faturas já geradas. Se o valor estiver errado, 
  // é melhor deletar e criar de novo.
  await prisma.billing.update({
    where: { id },
    data: {
      title,
      status
    }
  })

  revalidatePath("/business")
}