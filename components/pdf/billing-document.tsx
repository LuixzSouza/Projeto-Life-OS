// Documento PDF de uma Cobrança (Negócios): contrato + parcelas, pronto para
// enviar ao cliente. Valores chegam JÁ formatados (a moeda vem do
// CurrencyProvider do app — o PDF não decide formatação).
//
// IDENTIDADE PRÓPRIA (preto & branco): ao contrário dos outros PDFs do app
// (que usam o gradiente Life OS via pdf-kit), a cobrança é a "cara" do usuário.
// Aqui o visual é monocromático, editorial e profissional, assinado com a marca
// <Luixz/>. Por isso este documento NÃO usa BrandedPage/SectionTitle/Pill do kit
// — só reaproveita os neutros (zinc) e as fontes já registradas.
import React from "react";
import {
  Document, Page, View, Text, Image, StyleSheet,
} from "@react-pdf/renderer";
import { pdfTheme } from "./pdf-kit"; // importa só os neutros + registra as fontes

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
  /** QR Code do PIX (data URL PNG) — gerado no cliente a partir do payload. */
  pixQrDataUrl?: string | null;
  /** Payload PIX "copia e cola" (BR Code) — sai impresso e selecionável. */
  pixPayload?: string | null;
  generatedAt: string;
  totals: { total: string; paid: string; open: string };
  invoices: BillingPdfInvoice[];
  notes?: string | null;
}

/* ----------------------------------------------------------------------------
   PALETA MONOCROMÁTICA — só preto, branco e cinzas (zinc do tema).
   ---------------------------------------------------------------------------- */
const c = {
  ink: pdfTheme.ink,     // #18181B — quase-preto (texto forte, marca)
  body: pdfTheme.body,   // #3F3F46
  muted: pdfTheme.muted, // #71717A
  faint: pdfTheme.faint, // #A1A1AA
  border: pdfTheme.border, // #E4E4E7
  line: pdfTheme.line,   // #F4F4F5
  bgSoft: pdfTheme.bgSoft, // #FAFAFA
  white: pdfTheme.white,
};

/* Selo de situação em tons de cinza: Paga = preenchido; Pendente = contorno
   leve; Vencida = contorno forte (chama atenção sem precisar de cor). */
const PILL: Record<BillingPdfInvoice["tone"], { bg: string; fg: string; border: string }> = {
  paid: { bg: c.ink, fg: c.white, border: c.ink },
  open: { bg: c.white, fg: c.muted, border: c.border },
  late: { bg: c.white, fg: c.ink, border: c.ink },
};

const s = StyleSheet.create({
  page: {
    paddingTop: 92,
    paddingBottom: 58,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 400,
    color: c.body,
    backgroundColor: c.white,
  },

  /* --- Cabeçalho fixo (marca <Luixz/> + tipo do documento) --- */
  header: { position: "absolute", top: 0, left: 0, right: 0 },
  headerInner: {
    height: 60,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandTag: { color: c.muted, fontSize: 7.5, marginTop: 3, letterSpacing: 0.2 },
  docKicker: {
    color: c.ink, fontSize: 8.5, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: 1.6,
  },
  docMeta: { color: c.muted, fontSize: 7.5, marginTop: 3, fontFamily: "Geist Mono" },

  // Régua do cabeçalho: hairline cinza com um traço preto curto à esquerda.
  ruleWrap: { paddingHorizontal: 44, marginTop: 11 },
  ruleLine: { height: 1, backgroundColor: c.border, position: "relative" },
  ruleInk: { position: "absolute", left: 0, top: -0.5, width: 46, height: 2, backgroundColor: c.ink },

  /* --- Título do documento --- */
  titleBlock: { marginBottom: 22 },
  title: { fontSize: 24, fontWeight: 700, color: c.ink, letterSpacing: -0.7 },
  subtitle: { fontSize: 9.5, color: c.muted, marginTop: 6, lineHeight: 1.45 },
  titleUnderline: { marginTop: 11, width: 38, height: 2.5, backgroundColor: c.ink },

  /* --- KPIs --- */
  kpiRow: { flexDirection: "row", gap: 9, marginBottom: 22 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 9,
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: c.white,
  },
  kpiPrimary: { backgroundColor: c.ink, borderColor: c.ink }, // "Em aberto" em destaque sólido
  kpiLabel: {
    fontSize: 6.8, fontWeight: 600, color: c.muted,
    textTransform: "uppercase", letterSpacing: 0.9,
  },
  kpiLabelOnInk: { color: c.faint },
  kpiValue: { fontSize: 16.5, fontWeight: 700, color: c.ink, letterSpacing: -0.3, marginTop: 5, fontFamily: "Geist Mono" },
  kpiValueOnInk: { color: c.white },

  /* --- Seção --- */
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 8.5, fontWeight: 700, color: c.ink,
    textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 10,
  },

  /* --- Tabela de parcelas --- */
  table: { borderWidth: 1, borderColor: c.border, borderRadius: 9, overflow: "hidden" },
  tableHeader: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: c.bgSoft, paddingVertical: 7, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: c.border,
  },
  th: { fontSize: 6.8, color: c.muted, textTransform: "uppercase", letterSpacing: 0.9, fontWeight: 600 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 8, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: c.line,
  },
  rowLast: { borderBottomWidth: 0 },
  cellTitle: { flex: 1, fontSize: 9.5, fontWeight: 500, color: c.ink },
  cellDue: { width: 80, fontSize: 9, fontFamily: "Geist Mono", color: c.muted },
  cellValue: { width: 92, fontSize: 9.5, fontFamily: "Geist Mono", fontWeight: 600, color: c.ink, textAlign: "right" },
  cellStatus: { width: 78, alignItems: "flex-end" },

  pill: { fontSize: 7, fontWeight: 600, borderRadius: 99, borderWidth: 1, paddingVertical: 2.5, paddingHorizontal: 7 },

  /* --- Caixa do PIX (monocromática, com QR) --- */
  pixBox: {
    borderWidth: 1, borderColor: c.ink, borderRadius: 10,
    backgroundColor: c.bgSoft, padding: 15,
    flexDirection: "row", alignItems: "center", gap: 15,
  },
  pixInfo: { flex: 1 },
  pixLabel: { fontSize: 6.8, fontWeight: 700, color: c.ink, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  pixKey: { fontSize: 11.5, fontFamily: "Geist Mono", fontWeight: 600, color: c.ink },
  pixHint: { fontSize: 7.5, color: c.muted, marginTop: 5, lineHeight: 1.5 },
  pixCopiaLabel: { fontSize: 6.5, fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: 0.7, marginTop: 9, marginBottom: 3 },
  pixCopia: { fontSize: 6, fontFamily: "Geist Mono", color: c.muted, lineHeight: 1.5 },
  pixQrCard: { backgroundColor: c.white, borderWidth: 1, borderColor: c.ink, borderRadius: 9, padding: 7 },
  pixQr: { width: 92, height: 92 },
  pixQrCaption: { fontSize: 6.5, color: c.muted, textAlign: "center", marginTop: 4 },

  notesText: { fontSize: 9.5, color: c.body, lineHeight: 1.6 },

  /* --- Assinatura --- */
  signWrap: { marginTop: 28 },
  signLabel: { fontSize: 9.5, color: c.muted, marginBottom: 6 },
  signBiz: { fontSize: 9.5, color: c.ink, fontWeight: 600, marginTop: 3 },

  /* --- Rodapé fixo --- */
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 40,
    paddingHorizontal: 44, flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderTopWidth: 1, borderTopColor: c.line,
  },
  footText: { fontSize: 7.5, color: c.faint, fontFamily: "Geist Mono" },
});

/** Marca pessoal do usuário: o wordmark <Luixz/> em mono, com as chaves em
 *  cinza (estilo "tag") e o nome em preto. É a assinatura do documento. */
function Wordmark({ size = 13 }: { size?: number }) {
  return (
    <Text style={{ fontFamily: "Geist Mono", fontSize: size, fontWeight: 600, letterSpacing: -0.3 }}>
      <Text style={{ color: c.faint }}>{"<"}</Text>
      <Text style={{ color: c.ink }}>Luixz</Text>
      <Text style={{ color: c.faint }}>{" />"}</Text>
    </Text>
  );
}

export function BillingDocument({
  billingTitle, clientName, clientCompany, clientDocument, businessName,
  pixKey, pixQrDataUrl, pixPayload, generatedAt, totals, invoices, notes,
}: BillingDocumentProps) {
  const clientLine = [clientName, clientCompany, clientDocument].filter(Boolean).join(" · ");

  return (
    <Document title={`Cobrança — ${billingTitle}`} author={businessName ?? "Luixz"}>
      <Page size="A4" style={s.page} wrap>
        {/* CABEÇALHO FIXO — marca <Luixz/> à esquerda, tipo do documento à direita */}
        <View style={s.header} fixed>
          <View style={s.headerInner}>
            <View>
              <Wordmark size={14} />
              {businessName ? <Text style={s.brandTag}>{businessName}</Text> : null}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={s.docKicker}>Resumo de Cobrança</Text>
              <Text style={s.docMeta}>{generatedAt}</Text>
            </View>
          </View>
          <View style={s.ruleWrap}>
            <View style={s.ruleLine}>
              <View style={s.ruleInk} />
            </View>
          </View>
        </View>

        {/* TÍTULO */}
        <View style={s.titleBlock}>
          <Text style={s.title}>{billingTitle}</Text>
          {clientLine ? <Text style={s.subtitle}>Cliente: {clientLine}</Text> : null}
          <View style={s.titleUnderline} />
        </View>

        {/* KPIs — "Em aberto" em bloco preto sólido (foco do documento) */}
        <View style={s.kpiRow}>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Valor total</Text>
            <Text style={s.kpiValue}>{totals.total}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>Já pago</Text>
            <Text style={s.kpiValue}>{totals.paid}</Text>
          </View>
          <View style={[s.kpi, s.kpiPrimary]}>
            <Text style={[s.kpiLabel, s.kpiLabelOnInk]}>Em aberto</Text>
            <Text style={[s.kpiValue, s.kpiValueOnInk]}>{totals.open}</Text>
          </View>
        </View>

        {/* PARCELAS */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Parcelas</Text>
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1 }]}>Descrição</Text>
              <Text style={[s.th, { width: 80 }]}>Vencimento</Text>
              <Text style={[s.th, { width: 92, textAlign: "right" }]}>Valor</Text>
              <Text style={[s.th, { width: 78, textAlign: "right" }]}>Situação</Text>
            </View>
            {invoices.map((inv, i) => {
              const t = PILL[inv.tone];
              return (
                <View key={i} style={[s.row, i === invoices.length - 1 ? s.rowLast : {}]} wrap={false}>
                  <Text style={s.cellTitle}>{inv.label}</Text>
                  <Text style={s.cellDue}>{inv.due}</Text>
                  <Text style={s.cellValue}>{inv.value}</Text>
                  <View style={s.cellStatus}>
                    <Text style={[s.pill, { color: t.fg, backgroundColor: t.bg, borderColor: t.border }]}>
                      {inv.statusLabel}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* PIX */}
        {pixKey ? (
          <View style={s.section} wrap={false}>
            <View style={s.pixBox}>
              <View style={s.pixInfo}>
                <Text style={s.pixLabel}>Pagamento via PIX</Text>
                <Text style={s.pixKey}>{pixKey}</Text>
                <Text style={s.pixHint}>
                  {pixQrDataUrl
                    ? "Aponte a câmera do app do seu banco para o QR Code ao lado — o valor em aberto já vai preenchido."
                    : "Copie a chave acima no app do seu banco."}
                </Text>
                {pixPayload ? (
                  <>
                    <Text style={s.pixCopiaLabel}>PIX copia e cola</Text>
                    {/* Quebra manual em linhas: o wrap automático injeta hífen
                        na quebra e corromperia o código ao copiar do PDF. */}
                    {(pixPayload.match(/.{1,52}/g) ?? []).map((chunk, i) => (
                      <Text key={i} style={s.pixCopia}>{chunk}</Text>
                    ))}
                  </>
                ) : null}
              </View>
              {pixQrDataUrl ? (
                <View style={s.pixQrCard}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não possui prop alt */}
                  <Image style={s.pixQr} src={pixQrDataUrl} />
                  <Text style={s.pixQrCaption}>Pagar com PIX</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* OBSERVAÇÕES */}
        {notes ? (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Observações</Text>
            <Text style={s.notesText}>{notes}</Text>
          </View>
        ) : null}

        {/* ASSINATURA — fechada com a marca pessoal */}
        <View style={s.signWrap}>
          <Text style={s.signLabel}>Atenciosamente,</Text>
          <Wordmark size={12.5} />
          {businessName ? <Text style={s.signBiz}>{businessName}</Text> : null}
        </View>

        {/* RODAPÉ FIXO */}
        <View style={s.footer} fixed>
          <Wordmark size={8.5} />
          <Text
            style={s.footText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
