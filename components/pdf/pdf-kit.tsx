// Kit base para documentos PDF do Life OS (react-pdf).
// Centraliza tema, fontes, marca, cabeçalho e rodapé para que qualquer módulo
// (Nutrição, Finanças, etc.) gere PDFs com a MESMA identidade do app:
// tipografia Geist, neutros zinc e o gradiente da marca (índigo→violeta→rosa).

import React from "react";
import {
  Document, Page, View, Text, StyleSheet, Font,
  Svg, Rect, Defs, LinearGradient, Stop,
} from "@react-pdf/renderer";

/* ----------------------------------------------------------------------------
   FONTES — Geist (a fonte do app), servida de /public/fonts (local-first).
   Registro idempotente: o módulo pode ser importado mais de uma vez.
   ---------------------------------------------------------------------------- */
// No navegador as fontes vêm de /public/fonts; em Node (scripts/preview) do
// caminho físico do projeto — assim o kit funciona nos dois mundos.
const FONT_BASE =
  typeof window === "undefined"
    ? `${process.cwd().replace(/\\/g, "/")}/public/fonts`
    : "/fonts";

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: "Geist",
    fonts: [
      { src: `${FONT_BASE}/geist-sans-400.woff`, fontWeight: 400 },
      { src: `${FONT_BASE}/geist-sans-500.woff`, fontWeight: 500 },
      { src: `${FONT_BASE}/geist-sans-600.woff`, fontWeight: 600 },
      { src: `${FONT_BASE}/geist-sans-700.woff`, fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Geist Mono",
    fonts: [
      { src: `${FONT_BASE}/geist-mono-400.woff`, fontWeight: 400 },
      { src: `${FONT_BASE}/geist-mono-600.woff`, fontWeight: 600 },
    ],
  });
  // Sem hifenização automática: quebras de palavra aleatórias parecem bug.
  Font.registerHyphenationCallback((word) => [word]);
}
ensureFonts();

/* ----------------------------------------------------------------------------
   TEMA — neutros zinc (iguais ao app) + gradiente da marca.
   ---------------------------------------------------------------------------- */
export const pdfTheme = {
  // Gradiente da marca (landing/launcher): índigo → violeta → rosa.
  brandA: "#6366F1",
  brandB: "#A855F7",
  brandC: "#EC4899",

  primary: "#6366F1",
  primaryDark: "#4F46E5",
  primarySoft: "#EEF2FF",

  ink: "#18181B",   // zinc-900
  body: "#3F3F46",  // zinc-700
  muted: "#71717A", // zinc-500
  faint: "#A1A1AA", // zinc-400
  border: "#E4E4E7",// zinc-200
  line: "#F4F4F5",  // zinc-100
  bgSoft: "#FAFAFA",// zinc-50

  success: "#059669",
  successSoft: "#ECFDF5",
  danger: "#E11D48",
  dangerSoft: "#FFF1F2",
  amber: "#D97706",
  amberSoft: "#FFFBEB",
  white: "#FFFFFF",
};

export const pdf = StyleSheet.create({
  page: {
    paddingTop: 96,
    paddingBottom: 60,
    paddingHorizontal: 44,
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 400,
    color: pdfTheme.body,
    backgroundColor: pdfTheme.white,
  },

  // --- Cabeçalho fixo (branco, com fio gradiente da marca) ---
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerInner: {
    height: 62,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  brandTextCol: { marginLeft: 9 },
  brandName: { color: pdfTheme.ink, fontWeight: 700, fontSize: 12.5, letterSpacing: -0.2 },
  brandTagline: { color: pdfTheme.muted, fontSize: 7, marginTop: 1.5 },
  headerRight: { alignItems: "flex-end" },
  headerDoc: {
    color: pdfTheme.ink, fontSize: 9, fontWeight: 600,
    textTransform: "uppercase", letterSpacing: 1.2,
  },
  headerMeta: { color: pdfTheme.muted, fontSize: 7.5, marginTop: 2.5 },

  // --- Título da página ---
  titleBlock: { marginBottom: 20 },
  title: { fontSize: 23, fontWeight: 700, color: pdfTheme.ink, letterSpacing: -0.6 },
  subtitle: { fontSize: 10, color: pdfTheme.muted, marginTop: 5, lineHeight: 1.4 },

  // --- Seções ---
  sectionTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: pdfTheme.ink,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 9,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  // --- KPIs ---
  kpiRow: { flexDirection: "row", gap: 9, marginBottom: 18 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 11,
    backgroundColor: pdfTheme.white,
  },
  kpiLabel: {
    fontSize: 7,
    fontWeight: 600,
    color: pdfTheme.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  kpiValueRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4.5 },
  kpiValue: { fontSize: 16, fontWeight: 700, color: pdfTheme.ink, letterSpacing: -0.3 },
  kpiUnit: { fontSize: 7.5, fontWeight: 500, color: pdfTheme.muted, marginLeft: 3.5, marginBottom: 1.5 },

  // --- Rodapé fixo ---
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    paddingHorizontal: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: pdfTheme.line,
  },
  footerBrandRow: { flexDirection: "row", alignItems: "center" },
  footerBrand: { fontSize: 7.5, fontWeight: 600, color: pdfTheme.muted, marginLeft: 5 },
  footerText: { fontSize: 7.5, color: pdfTheme.faint },
});

/* ----------------------------------------------------------------------------
   PEÇAS DE MARCA (gradiente via SVG — react-pdf não tem gradient em View)
   ---------------------------------------------------------------------------- */

/** Fio horizontal com o gradiente da marca (header, divisores especiais). */
export function GradientRule({ height = 2.5, width = "100%", radius = 0 }: { height?: number; width?: number | string; radius?: number }) {
  return (
    <Svg viewBox="0 0 100 4" preserveAspectRatio="none" style={{ width, height }}>
      <Defs>
        <LinearGradient id="lifeosRule" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={pdfTheme.brandA} />
          <Stop offset="0.5" stopColor={pdfTheme.brandB} />
          <Stop offset="1" stopColor={pdfTheme.brandC} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={100} height={4} rx={radius} fill="url('#lifeosRule')" />
    </Svg>
  );
}

/** Quadradinho com o gradiente da marca (logo e bullets de seção). */
function GradientSquare({ size, radius, id }: { size: number; radius: number; id: string }) {
  return (
    <Svg viewBox="0 0 24 24" style={{ width: size, height: size }}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={pdfTheme.brandA} />
          <Stop offset="0.55" stopColor={pdfTheme.brandB} />
          <Stop offset="1" stopColor={pdfTheme.brandC} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={24} height={24} rx={(radius / size) * 24} fill={`url('#${id}')`} />
    </Svg>
  );
}

/** Logo da marca: quadrado gradiente com o "L" branco. */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <GradientSquare size={size} radius={size * 0.3} id="lifeosMark" />
      <View
        style={{
          position: "absolute", top: 0, left: 0, width: size, height: size,
          alignItems: "center", justifyContent: "center",
        }}
      >
        <Text style={{ color: pdfTheme.white, fontWeight: 700, fontSize: size * 0.54 }}>L</Text>
      </View>
    </View>
  );
}

/* ----------------------------------------------------------------------------
   BLOCO DE MARCA (header/rodapé/título)
   ---------------------------------------------------------------------------- */

export function BrandHeader({ docTitle, meta }: { docTitle: string; meta?: string }) {
  return (
    <View style={pdf.header} fixed>
      <View style={pdf.headerInner}>
        <View style={pdf.brandRow}>
          <BrandMark size={24} />
          <View style={pdf.brandTextCol}>
            <Text style={pdf.brandName}>Life OS</Text>
            <Text style={pdf.brandTagline}>Seu segundo cérebro pessoal</Text>
          </View>
        </View>
        <View style={pdf.headerRight}>
          <Text style={pdf.headerDoc}>{docTitle}</Text>
          {meta ? <Text style={pdf.headerMeta}>{meta}</Text> : null}
        </View>
      </View>
      <GradientRule height={2.5} />
    </View>
  );
}

export function BrandFooter({ note }: { note?: string }) {
  return (
    <View style={pdf.footer} fixed>
      <View style={pdf.footerBrandRow}>
        <GradientSquare size={6} radius={2} id="lifeosFootDot" />
        <Text style={pdf.footerBrand}>Life OS</Text>
        {note ? <Text style={[pdf.footerText, { marginLeft: 7 }]}>· {note}</Text> : null}
      </View>
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
      <View style={{ marginTop: 9 }}>
        <GradientRule height={3} width={34} radius={2} />
      </View>
    </View>
  );
}

/** Título de seção com o bullet gradiente da marca. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={pdf.sectionTitleRow}>
      <GradientSquare size={7} radius={2} id="lifeosSection" />
      <Text style={[pdf.sectionTitle, { marginBottom: 0, marginLeft: 6 }]}>{children}</Text>
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

/* ----------------------------------------------------------------------------
   PILL — selo de status (Paga/Vencida/tags…), igual aos badges suaves do app.
   ---------------------------------------------------------------------------- */
export type PillTone = "primary" | "success" | "danger" | "amber" | "neutral";

const PILL_TONES: Record<PillTone, { bg: string; fg: string }> = {
  primary: { bg: pdfTheme.primarySoft, fg: pdfTheme.primaryDark },
  success: { bg: pdfTheme.successSoft, fg: pdfTheme.success },
  danger: { bg: pdfTheme.dangerSoft, fg: pdfTheme.danger },
  amber: { bg: pdfTheme.amberSoft, fg: pdfTheme.amber },
  neutral: { bg: pdfTheme.line, fg: pdfTheme.muted },
};

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: PillTone }) {
  const t = PILL_TONES[tone];
  return (
    <Text
      style={{
        fontSize: 7.5,
        fontWeight: 600,
        color: t.fg,
        backgroundColor: t.bg,
        borderRadius: 99,
        paddingVertical: 2.5,
        paddingHorizontal: 7,
      }}
    >
      {children}
    </Text>
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
