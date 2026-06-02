// Kit base para documentos PDF do Life OS (react-pdf).
// Centraliza tema, marca, cabeçalho e rodapé para que qualquer módulo
// (Nutrição, Finanças, etc.) gere PDFs com identidade visual consistente.

import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export const pdfTheme = {
  primary: "#3B5BDB",
  primaryDark: "#2D49B8",
  primarySoft: "#EEF1FE",
  ink: "#1F2430",
  body: "#374151",
  muted: "#6B7280",
  faint: "#9CA3AF",
  border: "#E5E7EB",
  line: "#EEF0F3",
  bgSoft: "#F8FAFC",
  success: "#16A34A",
  danger: "#DC2626",
  white: "#FFFFFF",
};

export const pdf = StyleSheet.create({
  page: {
    paddingTop: 92,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: pdfTheme.body,
    backgroundColor: pdfTheme.white,
  },

  // --- Cabeçalho fixo ---
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: pdfTheme.primary,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandMark: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: pdfTheme.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  brandMarkText: { color: pdfTheme.primary, fontFamily: "Helvetica-Bold", fontSize: 12 },
  brandName: { color: pdfTheme.white, fontFamily: "Helvetica-Bold", fontSize: 13, letterSpacing: 0.3 },
  brandTagline: { color: "#DCE3FF", fontSize: 7.5, marginTop: 1 },
  headerRight: { alignItems: "flex-end" },
  headerDoc: { color: pdfTheme.white, fontSize: 9, fontFamily: "Helvetica-Bold" },
  headerMeta: { color: "#DCE3FF", fontSize: 7.5, marginTop: 2 },

  // --- Título da página ---
  titleBlock: { marginBottom: 16 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", color: pdfTheme.ink },
  subtitle: { fontSize: 10, color: pdfTheme.muted, marginTop: 3 },

  // --- Seções ---
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: pdfTheme.ink,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },

  // --- KPIs ---
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: pdfTheme.bgSoft,
  },
  kpiLabel: { fontSize: 7.5, color: pdfTheme.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  kpiValueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 3 },
  kpiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: pdfTheme.ink },
  kpiUnit: { fontSize: 8, color: pdfTheme.muted, marginLeft: 3, marginBottom: 1.5 },

  // --- Rodapé fixo ---
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: pdfTheme.line,
  },
  footerText: { fontSize: 7.5, color: pdfTheme.faint },
});

export function BrandHeader({ docTitle, meta }: { docTitle: string; meta?: string }) {
  return (
    <View style={pdf.header} fixed>
      <View style={pdf.brandRow}>
        <View style={pdf.brandMark}>
          <Text style={pdf.brandMarkText}>L</Text>
        </View>
        <View>
          <Text style={pdf.brandName}>Life OS</Text>
          <Text style={pdf.brandTagline}>Seu segundo cérebro pessoal</Text>
        </View>
      </View>
      <View style={pdf.headerRight}>
        <Text style={pdf.headerDoc}>{docTitle}</Text>
        {meta ? <Text style={pdf.headerMeta}>{meta}</Text> : null}
      </View>
    </View>
  );
}

export function BrandFooter({ note }: { note?: string }) {
  return (
    <View style={pdf.footer} fixed>
      <Text style={pdf.footerText}>{note ?? "Gerado automaticamente pelo Life OS"}</Text>
      <Text
        style={pdf.footerText}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={pdf.titleBlock}>
      <Text style={pdf.title}>{title}</Text>
      {subtitle ? <Text style={pdf.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Kpi({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <View style={pdf.kpi}>
      <Text style={pdf.kpiLabel}>{label}</Text>
      <View style={pdf.kpiValueRow}>
        <Text style={[pdf.kpiValue, accent ? { color: accent } : {}]}>{value}</Text>
        {unit ? <Text style={pdf.kpiUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

/** Página padrão da marca: cabeçalho + rodapé fixos e área de conteúdo. */
export function BrandedPage({
  docTitle,
  headerMeta,
  footerNote,
  children,
}: {
  docTitle: string;
  headerMeta?: string;
  footerNote?: string;
  children: React.ReactNode;
}) {
  return (
    <Page size="A4" style={pdf.page} wrap>
      <BrandHeader docTitle={docTitle} meta={headerMeta} />
      {children}
      <BrandFooter note={footerNote} />
    </Page>
  );
}

export { Document, View, Text };
