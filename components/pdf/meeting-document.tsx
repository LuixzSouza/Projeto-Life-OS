// Documento PDF de uma Reunião do Life OS.
// Inclui resumo da IA, itens de ação, notas completas (transcrição) e anexos.
import React from "react";
import { StyleSheet, Image, Svg, Path } from "@react-pdf/renderer";
import {
  Document, View, Text, BrandedPage, PageTitle, Kpi, SectionTitle, Pill,
  pdf as base, pdfTheme,
} from "./pdf-kit";

export interface MeetingPdfImage {
  src: string;
  caption?: string;
}

export interface MeetingDocumentProps {
  title: string;
  dateLabel: string;
  generatedAt: string;
  notes: string;
  summary: string | null;
  actionItems: string[];
  images: MeetingPdfImage[];
  participants: string[];
  tags: string[];
  decisions: string[];
}

const s = StyleSheet.create({
  section: { marginBottom: 20 },
  summaryBox: {
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 10,
    backgroundColor: pdfTheme.primarySoft,
    padding: 13,
  },
  summaryText: { fontSize: 9.5, color: pdfTheme.body, lineHeight: 1.65 },

  actionRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  actionBadge: {
    width: 15, height: 15, borderRadius: 5,
    backgroundColor: pdfTheme.primarySoft,
    alignItems: "center", justifyContent: "center",
    marginRight: 8, marginTop: 0.5,
  },
  actionBadgeText: { fontSize: 8, fontWeight: 700, color: pdfTheme.primaryDark },
  actionText: { flex: 1, fontSize: 9.5, color: pdfTheme.body, lineHeight: 1.55 },

  decisionBadge: {
    width: 15, height: 15, borderRadius: 99,
    backgroundColor: pdfTheme.successSoft,
    alignItems: "center", justifyContent: "center",
    marginRight: 8, marginTop: 0.5,
  },

  noteParagraph: { fontSize: 9.5, color: pdfTheme.body, lineHeight: 1.65, marginBottom: 4.5 },
  emptyText: { fontSize: 9.5, color: pdfTheme.faint },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  metaLabel: {
    fontSize: 7, fontWeight: 600, color: pdfTheme.muted,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5,
  },
  metaBlock: { marginBottom: 11 },

  imageGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", gap: 8 },
  imageCard: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: pdfTheme.bgSoft,
  },
  image: { width: "100%", height: 90, objectFit: "cover" },
  caption: { fontSize: 7.5, color: pdfTheme.muted, paddingVertical: 4, paddingHorizontal: 6 },
});

export function MeetingDocument({
  title, dateLabel, generatedAt, notes, summary, actionItems, images, participants, tags, decisions,
}: MeetingDocumentProps) {
  const noteLines = notes.split("\n").filter((l) => l.trim().length > 0);

  return (
    <Document title={title} author="Life OS">
      <BrandedPage docTitle="Ata de Reunião" headerMeta={dateLabel} footerNote={`Gerado em ${generatedAt}`}>
        <PageTitle title={title} subtitle={dateLabel} />

        <View style={base.kpiRow}>
          <Kpi label="Anexos" value={String(images.length)} />
          <Kpi label="Itens de ação" value={String(actionItems.length)} accent={actionItems.length ? pdfTheme.primaryDark : undefined} />
          <Kpi label="Caracteres" value={notes.length.toLocaleString("pt-BR")} />
        </View>

        {(participants.length > 0 || tags.length > 0) ? (
          <View style={s.section}>
            {participants.length > 0 ? (
              <View style={s.metaBlock}>
                <Text style={s.metaLabel}>Participantes</Text>
                <View style={s.chipRow}>
                  {participants.map((p, i) => <Pill key={i} tone="primary">{p}</Pill>)}
                </View>
              </View>
            ) : null}
            {tags.length > 0 ? (
              <View style={s.metaBlock}>
                <Text style={s.metaLabel}>Tags</Text>
                <View style={s.chipRow}>
                  {tags.map((t, i) => <Pill key={i} tone="neutral">{t}</Pill>)}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {summary ? (
          <View style={s.section}>
            <SectionTitle>Resumo</SectionTitle>
            <View style={s.summaryBox}>
              <Text style={s.summaryText}>{summary}</Text>
            </View>
          </View>
        ) : null}

        {actionItems.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>Itens de ação</SectionTitle>
            {actionItems.map((item, i) => (
              <View key={i} style={s.actionRow} wrap={false}>
                <View style={s.actionBadge}><Text style={s.actionBadgeText}>{i + 1}</Text></View>
                <Text style={s.actionText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {decisions.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>Decisões</SectionTitle>
            {decisions.map((d, i) => (
              <View key={i} style={s.actionRow} wrap={false}>
                <View style={s.decisionBadge}>
                  {/* Check desenhado em SVG — a Geist não possui o glifo "✓". */}
                  <Svg viewBox="0 0 24 24" style={{ width: 8, height: 8 }}>
                    <Path d="M20 6L9 17l-5-5" stroke={pdfTheme.success} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                </View>
                <Text style={s.actionText}>{d}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.section}>
          <SectionTitle>Notas / Transcrição</SectionTitle>
          {noteLines.length > 0 ? (
            noteLines.map((line, i) => <Text key={i} style={s.noteParagraph}>{line}</Text>)
          ) : (
            <Text style={s.emptyText}>Sem notas registradas.</Text>
          )}
        </View>

        {images.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>Anexos</SectionTitle>
            <View style={s.imageGrid}>
              {images.map((img, i) => (
                <View key={i} style={s.imageCard} wrap={false}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não possui prop alt */}
                  <Image style={s.image} src={img.src} />
                  {img.caption ? <Text style={s.caption}>{img.caption}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </BrandedPage>
    </Document>
  );
}
