// Documento PDF da Retrospectiva (mês ou ano) — segue o pdf-kit da marca.
// Carregado por import dinâmico apenas quando o usuário exporta.

import React from "react";
import { StyleSheet } from "@react-pdf/renderer";
import {
  Document, BrandedPage, PageTitle, Kpi, SectionTitle, GradientRule,
  pdf, pdfTheme, View, Text,
} from "@/components/pdf/pdf-kit";
import { formatCurrency } from "@/lib/utils";
import { fmtMinutes, fmtKg, type MonthStats } from "@/components/review/review-types";
import type { TrendPoint } from "@/components/review/finance-trend-chart";

const s = StyleSheet.create({
  section: { marginBottom: 20 },
  compareNote: { fontSize: 8, color: pdfTheme.faint, marginTop: -10, marginBottom: 18 },

  // Categorias (barras com o gradiente da marca)
  catRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4.5 },
  catName: { width: 130, fontSize: 9, fontWeight: 500, color: pdfTheme.body },
  catTrack: {
    flex: 1, height: 6, backgroundColor: pdfTheme.line, borderRadius: 3,
    marginHorizontal: 9, overflow: "hidden", flexDirection: "row",
  },
  catValue: { width: 80, textAlign: "right", fontSize: 8.5, fontFamily: "Geist Mono", color: pdfTheme.muted },

  // Tabela mês a mês (card, números mono, zebra suave)
  table: { borderWidth: 1, borderColor: pdfTheme.border, borderRadius: 10, overflow: "hidden" },
  tHead: {
    flexDirection: "row",
    backgroundColor: pdfTheme.bgSoft,
    paddingVertical: 6.5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
  },
  tHeadText: { fontSize: 7, fontWeight: 600, color: pdfTheme.muted, textTransform: "uppercase", letterSpacing: 0.8 },
  tRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.line,
  },
  tRowAlt: { backgroundColor: pdfTheme.bgSoft },
  tRowLast: { borderBottomWidth: 0 },
  tMonth: { width: 70, fontSize: 9, fontWeight: 500, color: pdfTheme.ink },
  tCell: { flex: 1, textAlign: "right", fontSize: 8.5, fontFamily: "Geist Mono", color: pdfTheme.body },
});

export interface ReviewDocumentProps {
  periodLabel: string;
  prevLabel: string;
  generatedAt: string;
  currency: string;
  stats: MonthStats;
  prev: MonthStats;
  trend: TrendPoint[];
}

export function ReviewDocument({
  periodLabel, prevLabel, generatedAt, currency, stats, prev, trend,
}: ReviewDocumentProps) {
  const money = (v: number) => formatCurrency(v, { currency });
  const balance = stats.income - stats.expense;
  const maxCategory = stats.topCategories[0]?.total ?? 0;
  const hasTrend = trend.some((p) => p.income > 0 || p.expense > 0);
  const weightLine =
    stats.weightStart !== null && stats.weightEnd !== null
      ? `${fmtKg(stats.weightStart)} → ${fmtKg(stats.weightEnd)}`
      : "—";

  return (
    <Document
      title={`Retrospectiva — ${periodLabel}`}
      author="Life OS"
      subject="Retrospectiva consolidada"
    >
      <BrandedPage docTitle="Retrospectiva" headerMeta={generatedAt}>
        <PageTitle title={`Retrospectiva — ${periodLabel}`} subtitle={`Resumo consolidado · comparações contra ${prevLabel}`} />

        {/* Finanças */}
        <SectionTitle>Finanças</SectionTitle>
        <View style={pdf.kpiRow}>
          <Kpi label="Receitas" value={money(stats.income)} accent={pdfTheme.success} />
          <Kpi label="Despesas" value={money(stats.expense)} accent={pdfTheme.danger} />
          <Kpi label="Saldo" value={money(balance)} accent={balance >= 0 ? pdfTheme.ink : pdfTheme.danger} />
          <Kpi label="Lançamentos" value={String(stats.txCount)} />
        </View>
        <Text style={s.compareNote}>
          {prevLabel}: receitas {money(prev.income)} · despesas {money(prev.expense)}
        </Text>

        {stats.topCategories.length > 0 && (
          <View style={s.section}>
            <SectionTitle>Onde o dinheiro foi</SectionTitle>
            {stats.topCategories.map((c) => {
              const pct = maxCategory > 0 ? Math.max((c.total / maxCategory) * 100, 3) : 0;
              return (
                <View key={c.category} style={s.catRow}>
                  <Text style={s.catName}>{c.category}</Text>
                  <View style={s.catTrack}>
                    <GradientRule height={6} width={`${pct}%`} radius={2} />
                  </View>
                  <Text style={s.catValue}>{money(c.total)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Atividade */}
        <SectionTitle>Atividade</SectionTitle>
        <View style={pdf.kpiRow}>
          <Kpi label="Treinos" value={String(stats.workouts)} unit={stats.workoutMinutes > 0 ? fmtMinutes(stats.workoutMinutes) : undefined} />
          <Kpi label="Estudos" value={fmtMinutes(stats.studyMinutes)} unit={`${stats.studySessions} sessões`} />
          <Kpi label="Foco" value={fmtMinutes(stats.focusMinutes)} unit={`${stats.focusSessions} sessões`} />
          <Kpi label="Hábitos" value={String(stats.habitsDone)} />
        </View>
        <View style={pdf.kpiRow}>
          <Kpi label="Tarefas concluídas" value={String(stats.tasksDone)} />
          <Kpi label="Projetos concluídos" value={String(stats.projectsDone)} />
          <Kpi label="Notas criadas" value={String(stats.notesCreated)} />
          <Kpi label="Mídia concluída" value={String(stats.mediaCompleted)} />
        </View>

        {/* Saúde */}
        <SectionTitle>Saúde</SectionTitle>
        <View style={pdf.kpiRow}>
          <Kpi label="Sono médio" value={stats.sleepAvg !== null ? `${stats.sleepAvg.toFixed(1).replace(".", ",")}h` : "—"} />
          <Kpi label="Peso (kg)" value={weightLine} />
          <Kpi label="Refeições" value={String(stats.mealsCount)} />
          <Kpi
            label="Média kcal/refeição"
            value={stats.mealsCount > 0 && stats.kcalTotal > 0 ? String(Math.round(stats.kcalTotal / stats.mealsCount)) : "—"}
          />
        </View>

        {/* Mês a mês */}
        {hasTrend && (
          <View style={s.section}>
            <SectionTitle>Mês a mês</SectionTitle>
            <View style={s.table}>
              <View style={s.tHead}>
                <Text style={[s.tMonth, s.tHeadText, { fontFamily: "Geist" }]}>Mês</Text>
                <Text style={[s.tCell, s.tHeadText, { fontFamily: "Geist" }]}>Receitas</Text>
                <Text style={[s.tCell, s.tHeadText, { fontFamily: "Geist" }]}>Despesas</Text>
                <Text style={[s.tCell, s.tHeadText, { fontFamily: "Geist" }]}>Saldo</Text>
              </View>
              {trend.map((p, i) => (
                <View
                  key={p.monthKey}
                  style={[s.tRow, i % 2 === 1 ? s.tRowAlt : {}, i === trend.length - 1 ? s.tRowLast : {}]}
                  wrap={false}
                >
                  <Text style={s.tMonth}>{p.label}/{p.monthKey.slice(2, 4)}</Text>
                  <Text style={[s.tCell, { color: pdfTheme.success }]}>{money(p.income)}</Text>
                  <Text style={[s.tCell, { color: pdfTheme.danger }]}>{money(p.expense)}</Text>
                  <Text style={[s.tCell, { fontWeight: 600 }, p.balance < 0 ? { color: pdfTheme.danger } : { color: pdfTheme.ink }]}>{money(p.balance)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </BrandedPage>
    </Document>
  );
}
