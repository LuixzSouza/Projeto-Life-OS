// Helpers de formatação e geração de mensagens do módulo Business.
import type { BillingData } from "./business-types";

export const maskPhone = (value: string) => {
  if (!value) return ""
  value = value.replace(/\D/g, "")
  value = value.replace(/(\d{2})(\d)/, "($1) $2")
  value = value.replace(/(\d{5})(\d)/, "$1-$2")
  return value.substring(0, 15)
}

export const clearMask = (value: string) => value.replace(/\D/g, "")

export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

export const toInputDate = (date: Date) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
}

// 🟢 GERADOR DE MENSAGEM DINÂMICA
export const generateChargeMessage = (
    clientName: string,
    billing: BillingData,
    opts?: { pixKey?: string | null; businessName?: string | null }
): string => {
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

    // Chave PIX e assinatura vêm das Configurações (Perfil > Cobrança).
    const pixKey = opts?.pixKey?.trim();
    const signature = opts?.businessName?.trim();

    const pixLine = pixKey ? `\n\nSegue o PIX: ${pixKey}` : "";
    const signLine = signature ? `\n\n${signature}` : "\n\nObrigado!";

    return `Oi ${firstName}, ${greeting}! ${randomIntro}\n\n${invoiceLines}${pixLine}${signLine}`;
};
