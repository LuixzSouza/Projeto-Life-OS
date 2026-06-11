// Documento PDF de uma Cobrança (Negócios): contrato + parcelas, pronto para
// enviar ao cliente. Valores chegam JÁ formatados (a moeda vem do
// CurrencyProvider do app — o PDF não decide formatação).
import React from "react";
import { StyleSheet } from "@react-pdf/renderer";
import {
  Document, View, Text, BrandedPage, PageTitle, Kpi, SectionTitle, Pill,
  pdf as base, pdfTheme, type PillTone,
} from "./pdf-kit";

export interface BillingPdfInvoice {
  label: string; // "Parcela 1/3" ou "Mensalidade Janeiro"
  value: string; // já formatado (R$ 1.200,00)
  due: string; // dd/mm/aaaa
  statusLabel: string; // Paga | Pendente | Vencida
  tone: "paid" | "open" | "late";
}

export interface BillingDocumentProps {
  billingTitle: string;
  clientName: string;
  clientCompany: string | null;
  clientDocument: string | null;
  businessName: string | null;
  pixKey: string | null;
  generatedAt: string;
  totals: { total: string; paid: string; open: string };
  invoices: BillingPdfInvoice[];
  notes?: string | null;
}

const TONE_PILL: Record<BillingPdfInvoice["tone"], PillTone> = {
  paid: "success",
  open: "neutral",
  late: "danger",
};

const s = StyleSheet.create({
  section: { marginBottom: 20 },

  // Tabela de parcelas (card com header suave, números em mono)
  table: {
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: pdfTheme.bgSoft,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
  },
  th: { fontSize: 7, color: pdfTheme.muted, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7.5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.line,
  },
  rowLast: { borderBottomWidth: 0 },
  cellTitle: { flex: 1, fontSize: 9.5, fontWeight: 500, color: pdfTheme.ink },
  cellDue: { width: 80, fontSize: 9, fontFamily: "Geist Mono", color: pdfTheme.muted },
  cellValue: { width: 90, fontSize: 9.5, fontFamily: "Geist Mono", fontWeight: 600, color: pdfTheme.ink, textAlign: "right" },
  cellStatus: { width: 76, alignItems: "flex-end" },

  // Caixa do PIX (destaque suave da marca)
  pixBox: {
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 10,
    backgroundColor: pdfTheme.primarySoft,
    padding: 14,
  },
  pixLabel: { fontSize: 7, fontWeight: 600, color: pdfTheme.primaryDark, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  pixKey: { fontSize: 12, fontFamily: "Geist Mono", fontWeight: 600, color: pdfTheme.primaryDark },
  pixHint: { fontSize: 7.5, color: pdfTheme.muted, marginTop: 5 },

  notesText: { fontSize: 9.5, color: pdfTheme.body, lineHeight: 1.6 },
  signText: { fontSize: 9.5, color: pdfTheme.muted, marginTop: 26, lineHeight: 1.6 },
});

export function BillingDocument({
  billingTitle, clientName, clientCompany, clientDocument, businessName,
  pixKey, generatedAt, totals, invoices, notes,
}: BillingDocumentProps) {
  const clientLine = [clientName, clientCompany, clientDocument].filter(Boolean).join(" · ");

  return (
    <Document title={`Cobrança — ${billingTitle}`} author={businessName ?? "Life OS"}>
      <BrandedPage docTitle="Resumo de Cobrança" headerMeta={businessName ?? undefined} footerNote={`Gerado em ${generatedAt}`}>
        <PageTitle title={billingTitle} subtitle={`Cliente: ${clientLine}`} />

        <View style={base.kpiRow}>
          <Kpi label="Valor total" value={totals.total} />
          <Kpi label="Já pago" value={totals.paid} accent={pdfTheme.success} />
          <Kpi label="Em aberto" value={totals.open} accent={pdfTheme.primaryDark} />
        </View>

        <View style={s.section}>
          <SectionTitle>Parcelas</SectionTitle>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1 }]}>Descrição</Text>
              <Text style={[s.th, { width: 80 }]}>Vencimento</Text>
              <Text style={[s.th, { width: 90, textAlign: "right" }]}>Valor</Text>
              <Text style={[s.th, { width: 76, textAlign: "right" }]}>Situação</Text>
            </View>
            {invoices.map((inv, i) => (
              <View key={i} style={[s.row, i === invoices.length - 1 ? s.rowLast : {}]} wrap={false}>
                <Text style={s.cellTitle}>{inv.label}</Text>
                <Text style={s.cellDue}>{inv.due}</Text>
                <Text style={s.cellValue}>{inv.value}</Text>
                <View style={s.cellStatus}>
                  <Pill tone={TONE_PILL[inv.tone]}>{inv.statusLabel}</Pill>
                </View>
              </View>
            ))}
          </View>
        </View>

        {pixKey ? (
          <View style={s.section}>
            <View style={s.pixBox}>
              <Text style={s.pixLabel}>Pagamento via PIX</Text>
              <Text style={s.pixKey}>{pixKey}</Text>
              <Text style={s.pixHint}>Copie a chave acima no app do seu banco.</Text>
            </View>
          </View>
        ) : null}

        {notes ? (
          <View style={s.section}>
            <SectionTitle>Observações</SectionTitle>
            <Text style={s.notesText}>{notes}</Text>
          </View>
        ) : null}

        <Text style={s.signText}>{businessName ? `Atenciosamente,\n${businessName}` : "Obrigado pela parceria!"}</Text>
      </BrandedPage>
    </Document>
  );
}
