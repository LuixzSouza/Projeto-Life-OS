// Documento PDF de uma Reunião do Life OS.
// Inclui resumo da IA, itens de ação, notas completas (transcrição) e anexos.
import React from "react";
import { StyleSheet, Image } from "@react-pdf/renderer";
import {
  Document, View, Text, BrandedPage, PageTitle, Kpi, pdf as base, pdfTheme,
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
  section: { marginBottom: 18 },
  summaryBox: {
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 8,
    backgroundColor: pdfTheme.primarySoft,
    padding: 12,
  },
  summaryText: { fontSize: 10, color: pdfTheme.body, lineHeight: 1.6 },

  actionRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  actionBullet: {
    width: 14,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfTheme.primary,
  },
  actionText: { flex: 1, fontSize: 10, color: pdfTheme.body, lineHeight: 1.5 },

  noteParagraph: { fontSize: 9.5, color: pdfTheme.body, lineHeight: 1.6, marginBottom: 4 },
  emptyText: { fontSize: 9.5, color: pdfTheme.faint, fontStyle: "italic" },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    fontSize: 8.5,
    color: pdfTheme.primary,
    backgroundColor: pdfTheme.primarySoft,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  metaLabel: { fontSize: 8, color: pdfTheme.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  metaBlock: { marginBottom: 10 },

  imageGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", gap: 8 },
  imageCard: {
    width: "31.5%",
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 8,
  },
  image: { width: "100%", height: 90, objectFit: "cover" },
  caption: { fontSize: 7.5, color: pdfTheme.muted, paddingVertical: 3, paddingHorizontal: 5 },
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
          <Kpi label="Itens de ação" value={String(actionItems.length)} accent={actionItems.length ? pdfTheme.primary : undefined} />
          <Kpi label="Caracteres" value={notes.length.toLocaleString("pt-BR")} />
        </View>

        {(participants.length > 0 || tags.length > 0) ? (
          <View style={s.section}>
            {participants.length > 0 ? (
              <View style={s.metaBlock}>
                <Text style={s.metaLabel}>Participantes</Text>
                <View style={s.chipRow}>
                  {participants.map((p, i) => <Text key={i} style={s.chip}>{p}</Text>)}
                </View>
              </View>
            ) : null}
            {tags.length > 0 ? (
              <View style={s.metaBlock}>
                <Text style={s.metaLabel}>Tags</Text>
                <View style={s.chipRow}>
                  {tags.map((t, i) => <Text key={i} style={s.chip}>{t}</Text>)}
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {summary ? (
          <View style={s.section}>
            <Text style={base.sectionTitle}>Resumo</Text>
            <View style={s.summaryBox}>
              <Text style={s.summaryText}>{summary}</Text>
            </View>
          </View>
        ) : null}

        {actionItems.length > 0 ? (
          <View style={s.section}>
            <Text style={base.sectionTitle}>Itens de ação</Text>
            {actionItems.map((item, i) => (
              <View key={i} style={s.actionRow} wrap={false}>
                <Text style={s.actionBullet}>{i + 1}.</Text>
                <Text style={s.actionText}>{item}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {decisions.length > 0 ? (
          <View style={s.section}>
            <Text style={base.sectionTitle}>Decisões</Text>
            {decisions.map((d, i) => (
              <View key={i} style={s.actionRow} wrap={false}>
                <Text style={s.actionBullet}>✓</Text>
                <Text style={s.actionText}>{d}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={base.sectionTitle}>Notas / Transcrição</Text>
          {noteLines.length > 0 ? (
            noteLines.map((line, i) => <Text key={i} style={s.noteParagraph}>{line}</Text>)
          ) : (
            <Text style={s.emptyText}>Sem notas registradas.</Text>
          )}
        </View>

        {images.length > 0 ? (
          <View style={s.section}>
            <Text style={base.sectionTitle}>Anexos</Text>
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
