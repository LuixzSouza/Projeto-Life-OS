// Template de currículo em PDF — motor react-pdf (determinístico, local-first).
// Substitui o window.print da Fase 1. Foco: ATS-friendly (uma coluna, ordem
// clássica, texto linear que parsers de recrutamento leem sem embaralhar).
//
// IMPORTANTE: este documento NÃO leva a marca Life OS. É o currículo do usuário
// indo para um recrutador — só reaproveitamos do pdf-kit o registro da fonte
// Geist e a paleta de neutros. Nada de cabeçalho/rodapé "Life OS" aqui.

import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { PortfolioData } from "@/types/portfolio";
// Import só pelo efeito colateral: registra a fonte Geist no react-pdf.
import { pdfTheme } from "./pdf-kit";

/* ----------------------------------------------------------------------------
   i18n mínimo do "chrome" do documento (títulos + rótulos). A tradução de
   CONTEÚDO (bullets/resumo) é da Fase 6; aqui só o esqueleto e o formato.
   ---------------------------------------------------------------------------- */
interface ResumeDict {
  summary: string;
  experience: string;
  projects: string;
  education: string;
  skills: string;
  certifications: string;
  languages: string;
  stack: string;
  langs: string;
  frameworks: string;
  tools: string;
  soft: string;
  page: (n: number, t: number) => string;
}

const DICTS: Record<string, ResumeDict> = {
  "pt-BR": {
    summary: "Resumo Profissional",
    experience: "Experiência Profissional",
    projects: "Projetos",
    education: "Formação Acadêmica",
    skills: "Competências",
    certifications: "Certificações",
    languages: "Idiomas",
    stack: "Tecnologias",
    langs: "Linguagens",
    frameworks: "Frameworks",
    tools: "Ferramentas",
    soft: "Comportamentais",
    page: (n, t) => `Página ${n} de ${t}`,
  },
  "en-US": {
    summary: "Professional Summary",
    experience: "Professional Experience",
    projects: "Projects",
    education: "Education",
    skills: "Skills",
    certifications: "Certifications",
    languages: "Languages",
    stack: "Technologies",
    langs: "Languages",
    frameworks: "Frameworks",
    tools: "Tools",
    soft: "Soft skills",
    page: (n, t) => `Page ${n} of ${t}`,
  },
};

function dictFor(locale?: string): ResumeDict {
  return DICTS[locale ?? "pt-BR"] ?? DICTS["pt-BR"];
}

/* ----------------------------------------------------------------------------
   Anti-estouro de palavra gigante (URLs, e-mails). A hifenização automática é
   desligada globalmente no pdf-kit, então inserimos pontos de quebra invisíveis
   (U+200B) depois de separadores comuns — sem hífen visível, sem overflow.
   ---------------------------------------------------------------------------- */
function breakable(str: string): string {
  // 1) Quebra após separadores comuns (URLs, e-mails) — sem hífen visível.
  const withSeparators = str.replace(/([/\\._\-@?=&])/g, "$1​");
  // 2) Rede de segurança: sequências ainda longas SEM separador (nomes gigantes,
  //    "SupercalifragilisticAntidisestablishmentarianismo") recebem pontos de
  //    quebra invisíveis a cada ~20 chars. Só dispara em entradas patológicas.
  return withSeparators.replace(/[^\s​]{24,}/g, (run) =>
    run.replace(/(.{20})/g, "$1​")
  );
}

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 46,
    paddingHorizontal: 44,
    fontSize: 9.5,
    fontFamily: "Geist",
    fontWeight: 400,
    color: pdfTheme.body,
    lineHeight: 1.4,
    backgroundColor: pdfTheme.white,
  },

  // --- Cabeçalho (nome + contato) ---
  name: {
    fontSize: 22,
    fontWeight: 700,
    color: pdfTheme.ink,
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 10.5,
    fontWeight: 500,
    color: pdfTheme.body,
    marginTop: 3,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 7,
  },
  contactItem: {
    fontSize: 8.5,
    color: pdfTheme.muted,
    marginRight: 4,
  },
  headerRule: {
    borderBottomWidth: 1.5,
    borderBottomColor: pdfTheme.ink,
    marginTop: 12,
    marginBottom: 16,
  },

  // --- Seções ---
  section: { marginBottom: 15 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: pdfTheme.ink,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: pdfTheme.border,
    paddingBottom: 3.5,
    marginBottom: 8,
  },

  summaryText: {
    fontSize: 9.5,
    color: pdfTheme.body,
    textAlign: "justify",
  },

  // --- Item (experiência / projeto / formação) ---
  item: { marginBottom: 11 },
  itemHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: pdfTheme.ink,
    flex: 1,
    paddingRight: 10,
  },
  itemDates: {
    fontSize: 8.5,
    fontWeight: 500,
    color: pdfTheme.muted,
    textAlign: "right",
  },
  itemSub: {
    fontSize: 9,
    fontWeight: 600,
    color: pdfTheme.body,
    marginTop: 1.5,
  },
  itemSummary: {
    fontSize: 9,
    color: pdfTheme.body,
    marginTop: 3,
  },

  // --- Bullets ---
  bulletRow: {
    flexDirection: "row",
    marginTop: 2.5,
    paddingRight: 4,
  },
  bulletDot: {
    fontSize: 9,
    color: pdfTheme.muted,
    width: 10,
  },
  bulletText: {
    fontSize: 9,
    color: pdfTheme.body,
    flex: 1,
  },

  metaLine: {
    fontSize: 8.5,
    color: pdfTheme.muted,
    marginTop: 3,
  },
  metaLabel: { fontWeight: 600, color: pdfTheme.body },

  // --- Competências ---
  skillGroup: { marginBottom: 4 },
  skillLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: pdfTheme.ink,
  },
  skillValue: {
    fontSize: 9,
    color: pdfTheme.body,
  },

  // --- Rodapé (paginação) ---
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 7.5,
    color: pdfTheme.faint,
  },
});

/** Título de seção que nunca fica órfão no fim da página. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={s.sectionTitle} minPresenceAhead={40}>
      {children}
    </Text>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

export interface ResumePdfProps {
  data: PortfolioData;
  locale?: string;
  /** ATS (padrão). MODERN fica para a Fase 6 — hoje cai no ATS. */
  template?: string;
}

export function ResumePdf({ data, locale }: ResumePdfProps) {
  const t = dictFor(locale);
  const size = (locale ?? "pt-BR") === "en-US" ? "LETTER" : "A4";
  const { hero, about, experience, projects, education, skills, certifications, languages } = data;

  // Linha de contato: só os campos preenchidos, unidos por " · ".
  const contacts: string[] = [];
  if (hero.email) contacts.push(hero.email);
  if (hero.phone) contacts.push(hero.phone);
  if (hero.location) contacts.push(hero.location);
  if (hero.website) contacts.push(hero.website);
  if (hero.socials?.linkedin) contacts.push(hero.socials.linkedin.replace(/^https?:\/\/(www\.)?/, ""));
  if (hero.socials?.github) contacts.push(hero.socials.github.replace(/^https?:\/\/(www\.)?/, ""));

  const summaryText = about.short || about.long;

  const hasSkills =
    skills.languages.length > 0 ||
    skills.frameworks.length > 0 ||
    skills.tools.length > 0 ||
    skills.softSkills.length > 0;

  return (
    <Document
      title={`Currículo — ${hero.name || "Sem nome"}`}
      author={hero.name || undefined}
    >
      <Page size={size} style={s.page} wrap>
        {/* CABEÇALHO */}
        <View>
          {hero.name ? <Text style={s.name}>{breakable(hero.name)}</Text> : null}
          {hero.headline ? <Text style={s.headline}>{breakable(hero.headline)}</Text> : null}
          {contacts.length > 0 ? (
            <View style={s.contactRow}>
              {contacts.map((c, i) => (
                <Text key={i} style={s.contactItem}>
                  {breakable(c)}
                  {i < contacts.length - 1 ? "  ·  " : ""}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <View style={s.headerRule} />

        {/* RESUMO */}
        {summaryText ? (
          <View style={s.section}>
            <SectionTitle>{t.summary}</SectionTitle>
            <Text style={s.summaryText}>{summaryText}</Text>
          </View>
        ) : null}

        {/* EXPERIÊNCIA */}
        {experience.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>{t.experience}</SectionTitle>
            {experience.map((exp) => {
              const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
              const sub = [exp.company, exp.location].filter(Boolean).join(" · ");
              return (
                <View key={exp.id} style={s.item} wrap={false} minPresenceAhead={30}>
                  <View style={s.itemHeadRow}>
                    <Text style={s.itemTitle}>{exp.role || exp.company}</Text>
                    {dates ? <Text style={s.itemDates}>{dates}</Text> : null}
                  </View>
                  {sub ? <Text style={s.itemSub}>{sub}</Text> : null}
                  {exp.summary ? <Text style={s.itemSummary}>{exp.summary}</Text> : null}
                  {exp.achievements.filter(Boolean).map((a, i) => (
                    <Bullet key={i} text={a} />
                  ))}
                  {exp.stack.length > 0 ? (
                    <Text style={s.metaLine}>
                      <Text style={s.metaLabel}>{t.stack}: </Text>
                      {exp.stack.join(", ")}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* PROJETOS */}
        {projects.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>{t.projects}</SectionTitle>
            {projects.map((p) => {
              const sub = [p.role, p.duration].filter(Boolean).join(" · ");
              const desc = [p.problem, p.solution, p.impact].filter(Boolean).join(" ");
              const link = p.liveLink || p.repoLink;
              return (
                <View key={p.id} style={s.item} wrap={false} minPresenceAhead={30}>
                  <View style={s.itemHeadRow}>
                    <Text style={s.itemTitle}>{p.title}</Text>
                    {p.duration ? <Text style={s.itemDates}>{p.duration}</Text> : null}
                  </View>
                  {p.role ? <Text style={s.itemSub}>{sub}</Text> : null}
                  {desc ? <Text style={s.itemSummary}>{desc}</Text> : null}
                  {link ? <Text style={s.metaLine}>{breakable(link.replace(/^https?:\/\/(www\.)?/, ""))}</Text> : null}
                  {p.stack.length > 0 ? (
                    <Text style={s.metaLine}>
                      <Text style={s.metaLabel}>{t.stack}: </Text>
                      {p.stack.join(", ")}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* FORMAÇÃO */}
        {education.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>{t.education}</SectionTitle>
            {education.map((edu) => (
              <View key={edu.id} style={s.item} wrap={false} minPresenceAhead={24}>
                <View style={s.itemHeadRow}>
                  <Text style={s.itemTitle}>{edu.institution}</Text>
                  {edu.dates ? <Text style={s.itemDates}>{edu.dates}</Text> : null}
                </View>
                {edu.degree ? <Text style={s.itemSub}>{edu.degree}</Text> : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* COMPETÊNCIAS — texto separado por vírgula (parsers extraem keywords daqui) */}
        {hasSkills ? (
          <View style={s.section}>
            <SectionTitle>{t.skills}</SectionTitle>
            {skills.languages.length > 0 ? (
              <Text style={s.skillGroup}>
                <Text style={s.skillLabel}>{t.langs}: </Text>
                <Text style={s.skillValue}>{skills.languages.map((x) => x.name).join(", ")}</Text>
              </Text>
            ) : null}
            {skills.frameworks.length > 0 ? (
              <Text style={s.skillGroup}>
                <Text style={s.skillLabel}>{t.frameworks}: </Text>
                <Text style={s.skillValue}>{skills.frameworks.map((x) => x.name).join(", ")}</Text>
              </Text>
            ) : null}
            {skills.tools.length > 0 ? (
              <Text style={s.skillGroup}>
                <Text style={s.skillLabel}>{t.tools}: </Text>
                <Text style={s.skillValue}>{skills.tools.map((x) => x.name).join(", ")}</Text>
              </Text>
            ) : null}
            {skills.softSkills.length > 0 ? (
              <Text style={s.skillGroup}>
                <Text style={s.skillLabel}>{t.soft}: </Text>
                <Text style={s.skillValue}>{skills.softSkills.join(", ")}</Text>
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* CERTIFICAÇÕES */}
        {certifications.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>{t.certifications}</SectionTitle>
            {certifications.map((c) => {
              const sub = [c.issuer, c.date].filter(Boolean).join(" · ");
              return (
                <View key={c.id} style={{ marginBottom: 5 }} wrap={false}>
                  <Text style={{ fontSize: 9.5, fontWeight: 600, color: pdfTheme.ink }}>{c.name}</Text>
                  {sub ? <Text style={s.metaLine}>{sub}</Text> : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* IDIOMAS */}
        {languages.length > 0 ? (
          <View style={s.section}>
            <SectionTitle>{t.languages}</SectionTitle>
            <Text style={s.skillValue}>
              {languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join("  ·  ")}
            </Text>
          </View>
        ) : null}

        {/* RODAPÉ — paginação em toda página */}
        <Text
          style={s.footer}
          fixed
          render={({ pageNumber, totalPages }) => t.page(pageNumber, totalPages)}
        />
      </Page>
    </Document>
  );
}

export default ResumePdf;
