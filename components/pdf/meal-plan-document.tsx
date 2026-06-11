// Documento PDF do Planejador Semanal de Nutrição.
import React from "react";
import { StyleSheet } from "@react-pdf/renderer";
import {
  Document, View, Text, BrandedPage, PageTitle, Kpi, SectionTitle, pdf as base, pdfTheme,
} from "./pdf-kit";

export interface MealPlanPdfDay {
  name: string;
  calories: number;
  over: boolean;
  meals: { label: string; title: string | null; items: string | null; calories: number | null }[];
}

export interface MealPlanDocumentProps {
  userName?: string;
  goal: number;
  isAutoGoal: boolean;
  tdee?: number | null;
  generatedAt: string;
  stats: { weekTotal: number; dailyAvg: number; daysPlanned: number; totalMeals: number };
  days: MealPlanPdfDay[];
  shopping: { name: string; amount: number }[];
}

const s = StyleSheet.create({
  // Grade de dias (2 colunas)
  dayGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  dayCard: {
    width: "48.5%",
    borderWidth: 1,
    borderColor: pdfTheme.border,
    borderRadius: 10,
    marginBottom: 12,
    overflow: "hidden",
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 7,
    paddingHorizontal: 11,
    backgroundColor: pdfTheme.bgSoft,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
  },
  dayName: { fontSize: 10.5, fontWeight: 600, color: pdfTheme.ink },
  kcalBadge: {
    fontSize: 7.5,
    fontWeight: 600,
    fontFamily: "Geist Mono",
    color: pdfTheme.primaryDark,
    backgroundColor: pdfTheme.primarySoft,
    paddingVertical: 2.5,
    paddingHorizontal: 7,
    borderRadius: 99,
  },
  kcalBadgeOver: { color: pdfTheme.danger, backgroundColor: pdfTheme.dangerSoft },

  dayBody: { paddingHorizontal: 11, paddingVertical: 6 },
  mealRow: { paddingVertical: 5.5, borderBottomWidth: 1, borderBottomColor: pdfTheme.line },
  mealRowLast: { borderBottomWidth: 0 },
  mealLabel: { fontSize: 6.5, fontWeight: 600, color: pdfTheme.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2.5 },
  mealTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  mealTitle: { fontSize: 9.5, fontWeight: 600, color: pdfTheme.ink, flex: 1, paddingRight: 6 },
  mealCal: { fontSize: 8, color: pdfTheme.primaryDark, fontFamily: "Geist Mono", fontWeight: 600 },
  mealItems: { fontSize: 8, color: pdfTheme.muted, marginTop: 2.5, lineHeight: 1.4 },
  mealEmpty: { fontSize: 8.5, color: pdfTheme.faint },

  // Lista de compras
  shopGrid: { flexDirection: "row", flexWrap: "wrap" },
  shopItem: { width: "33.33%", flexDirection: "row", alignItems: "center", paddingVertical: 4.5, paddingRight: 8 },
  shopBox: { width: 9, height: 9, borderWidth: 1.2, borderColor: pdfTheme.faint, borderRadius: 3, marginRight: 6 },
  shopQty: { fontSize: 8.5, fontFamily: "Geist Mono", fontWeight: 600, color: pdfTheme.primaryDark, marginRight: 4 },
  shopName: { fontSize: 9, color: pdfTheme.body, flex: 1 },
  emptyNote: { fontSize: 9, color: pdfTheme.faint },

  goalHint: {
    fontSize: 8,
    color: pdfTheme.primaryDark,
    marginBottom: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: pdfTheme.primarySoft,
    borderRadius: 8,
  },
});

const fmtQty = (q: number) => (Number.isInteger(q) ? `${q}` : q.toFixed(1).replace(/\.0$/, ""));

export function MealPlanDocument({
  userName, goal, isAutoGoal, tdee, generatedAt, stats, days, shopping,
}: MealPlanDocumentProps) {
  const subtitle = userName
    ? `Plano nutricional de ${userName} · Meta de ${goal.toLocaleString("pt-BR")} kcal/dia`
    : `Meta de ${goal.toLocaleString("pt-BR")} kcal/dia`;

  return (
    <Document title="Cardápio Semanal — Life OS" author="Life OS">
      <BrandedPage docTitle="Cardápio Semanal" headerMeta={generatedAt}>
        <PageTitle title="Cardápio Semanal" subtitle={subtitle} />

        {isAutoGoal && tdee ? (
          <Text style={s.goalHint}>
            Meta calculada automaticamente a partir do seu perfil corporal (gasto energético estimado: {tdee.toLocaleString("pt-BR")} kcal/dia).
          </Text>
        ) : null}

        {/* KPIs */}
        <View style={base.kpiRow}>
          <Kpi label="Meta diária" value={goal.toLocaleString("pt-BR")} unit="kcal" accent={pdfTheme.primary} />
          <Kpi label="Total da semana" value={stats.weekTotal.toLocaleString("pt-BR")} unit="kcal" />
          <Kpi label="Média por dia" value={stats.dailyAvg.toLocaleString("pt-BR")} unit="kcal" />
          <Kpi label="Dias planejados" value={`${stats.daysPlanned}`} unit="/ 7" />
        </View>

        {/* Plano por dia */}
        <SectionTitle>Plano por dia</SectionTitle>
        <View style={s.dayGrid}>
          {days.map((day) => (
            <View key={day.name} style={s.dayCard} wrap={false}>
              <View style={s.dayHeader}>
                <Text style={s.dayName}>{day.name}</Text>
                <Text style={[s.kcalBadge, day.over ? s.kcalBadgeOver : {}]}>{day.calories} kcal</Text>
              </View>
              <View style={s.dayBody}>
                {day.meals.map((meal, i) => {
                  const last = i === day.meals.length - 1;
                  return (
                    <View key={meal.label} style={[s.mealRow, last ? s.mealRowLast : {}]}>
                      <Text style={s.mealLabel}>{meal.label}</Text>
                      {meal.title ? (
                        <>
                          <View style={s.mealTitleRow}>
                            <Text style={s.mealTitle}>{meal.title}</Text>
                            {meal.calories != null && <Text style={s.mealCal}>{meal.calories} kcal</Text>}
                          </View>
                          {meal.items ? <Text style={s.mealItems}>{meal.items}</Text> : null}
                        </>
                      ) : (
                        <Text style={s.mealEmpty}>Nenhuma refeição planejada</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {/* Lista de compras */}
        <View break>
          <PageTitle title="Lista de Compras" subtitle="Ingredientes consolidados de todo o cardápio da semana." />
          {shopping.length > 0 ? (
            <View style={s.shopGrid}>
              {shopping.map((item) => (
                <View key={item.name} style={s.shopItem}>
                  <View style={s.shopBox} />
                  <Text style={s.shopQty}>{fmtQty(item.amount)}x</Text>
                  <Text style={s.shopName}>{item.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={s.emptyNote}>Nenhum ingrediente adicionado ainda.</Text>
          )}
        </View>
      </BrandedPage>
    </Document>
  );
}
