// Template de currículo em PDF — motor react-pdf (determinístico, local-first).
// Substitui o window.print da Fase 1. Foco: ATS-friendly (uma coluna, ordem
// clássica, texto linear que parsers de recrutamento leem sem embaralhar).
//
// IMPORTANTE: este documento NÃO leva a marca Life OS. É o currículo do usuário
// indo para um recrutador — só reaproveitamos do pdf-kit o registro da fonte
// Geist e a paleta de neutros. Nada de cabeçalho/rodapé "Life OS" aqui.

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { PortfolioData } from "@/types/portfolio";
import { resolveSectionOrder, type ResumeSectionKey } from "@/components/projects/resume/resume-sections";
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

// Accent profissional do currículo (indigo). Usado com parcimônia — headline,
// títulos de seção e bullets — para dar identidade sem quebrar a leitura ATS.
// É o PADRÃO; cada currículo pode sobrescrever via meta.accentColor.
const ACCENT = "#4F46E5";

// Só aceita hex #RRGGBB — evita cor inválida quebrar o render do react-pdf.
function resolveAccent(input?: string): string {
  return input && /^#[0-9a-fA-F]{6}$/.test(input) ? input : ACCENT;
}

const s = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingBottom: 52,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 400,
    color: pdfTheme.body,
    lineHeight: 1.55,
    backgroundColor: pdfTheme.white,
  },

  // --- Cabeçalho (nome + contato [+ foto opcional]) ---
  headerTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerText: { flex: 1, paddingRight: 14 },
  photoWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: pdfTheme.border,
  },
  photo: { width: 72, height: 72, objectFit: "cover" },
  name: {
    fontSize: 23,
    fontWeight: 700,
    color: pdfTheme.ink,
    letterSpacing: -0.5,
    // Sem lineHeight explícito de propósito: em react-pdf isso quebra o cálculo
    // de paginação e joga a 1ª seção para a página seguinte (página 1 vazia).
  },
  headline: {
    fontSize: 11,
    fontWeight: 600,
    color: ACCENT,
    marginTop: 6,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  contactItem: {
    fontSize: 9,
    color: pdfTheme.muted,
    marginRight: 4,
  },
  // Divisor do cabeçalho: tick accent curto + fio fino claro (moderno e discreto).
  // Altura TRAVADA (height fixa) — sem isso o `flex` do fio cresce na vertical e
  // empurra o conteúdo, deixando a página 1 vazia.
  headerDivider: {
    flexDirection: "row",
    alignItems: "center",
    height: 2.5,
    marginTop: 16,
    marginBottom: 22,
  },
  headerBar: { height: 2.5, width: 54, backgroundColor: ACCENT, borderRadius: 2 },
  headerLine: { height: 1, flexGrow: 1, backgroundColor: pdfTheme.border, marginLeft: 6 },

  // --- Seções ---
  section: { marginBottom: 22 },
  sectionTitle: {
    fontSize: 10.5,
    fontWeight: 700,
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  // Sublinhado do título: tick accent curto + fio fino claro (igual ao do header).
  // Altura TRAVADA — sem isso o flexGrow do fio cresce na vertical.
  sectionRule: {
    flexDirection: "row",
    alignItems: "center",
    height: 2,
    marginBottom: 13,
  },
  sectionRuleBar: { height: 2, width: 26, borderRadius: 1 },
  sectionRuleLine: { height: 1, flexGrow: 1, backgroundColor: pdfTheme.border, marginLeft: 5 },

  summaryText: {
    fontSize: 10,
    color: pdfTheme.body,
    textAlign: "left",
    lineHeight: 1.6,
  },

  // --- Item (experiência / projeto / formação) ---
  item: { marginBottom: 16 },
  itemHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: pdfTheme.ink,
    flex: 1,
    paddingRight: 10,
  },
  itemDates: {
    fontSize: 9,
    fontWeight: 500,
    color: pdfTheme.muted,
    textAlign: "right",
  },
  itemSub: {
    fontSize: 9.5,
    fontWeight: 600,
    color: pdfTheme.body,
    marginTop: 3,
  },
  itemSummary: {
    fontSize: 9.5,
    color: pdfTheme.body,
    marginTop: 5,
    lineHeight: 1.55,
  },

  // --- Bullets ---
  bulletRow: {
    flexDirection: "row",
    marginTop: 5,
    paddingRight: 4,
  },
  bulletDot: {
    fontSize: 9.5,
    color: ACCENT,
    width: 13,
  },
  bulletText: {
    fontSize: 9.5,
    color: pdfTheme.body,
    flex: 1,
    lineHeight: 1.5,
  },

  metaLine: {
    fontSize: 9,
    color: pdfTheme.muted,
    marginTop: 5,
  },
  metaLabel: { fontWeight: 600, color: pdfTheme.body },

  // --- Competências (2 colunas) ---
  skillGrid: { flexDirection: "row", flexWrap: "wrap" },
  skillCell: { width: "50%", paddingRight: 14, marginBottom: 7 },
  skillGroup: { marginBottom: 7 },
  skillLabel: {
    fontSize: 9.5,
    fontWeight: 700,
    color: pdfTheme.ink,
  },
  skillValue: {
    fontSize: 9.5,
    color: pdfTheme.body,
    lineHeight: 1.5,
  },

  // --- Rodapé (paginação) ---
  footer: {
    position: "absolute",
    bottom: 24,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 8,
    color: pdfTheme.faint,
  },
});

/** Título de seção com sublinhado de tick accent. Não orfana no fim da página. */
function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <View minPresenceAhead={44} wrap={false}>
      <Text style={[s.sectionTitle, { color: accent }]}>{children}</Text>
      <View style={s.sectionRule}>
        <View style={[s.sectionRuleBar, { backgroundColor: accent }]} />
        <View style={s.sectionRuleLine} />
      </View>
    </View>
  );
}

function Bullet({ text, accent }: { text: string; accent: string }) {
  return (
    <View style={s.bulletRow}>
      <Text style={[s.bulletDot, { color: accent }]}>•</Text>
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

function AtsResume({ data, locale }: ResumePdfProps) {
  const t = dictFor(locale);
  const size = (locale ?? "pt-BR") === "en-US" ? "LETTER" : "A4";
  const { hero, about, experience, projects, education, skills, certifications, languages } = data;
  const accent = resolveAccent(data.meta?.accentColor);

  // Linha de contato: só os campos preenchidos, unidos por " · ".
  const contacts: string[] = [];
  if (hero.email) contacts.push(hero.email);
  if (hero.phone) contacts.push(hero.phone);
  if (hero.location) contacts.push(hero.location);
  if (hero.website) contacts.push(hero.website);
  if (hero.socials?.linkedin) contacts.push(hero.socials.linkedin.replace(/^https?:\/\/(www\.)?/, ""));
  if (hero.socials?.github) contacts.push(hero.socials.github.replace(/^https?:\/\/(www\.)?/, ""));

  const summaryText = about.short || about.long;

  // Foto no cabeçalho: opt-in (meta.showPhoto) e só com data URL de imagem válida.
  const showPhoto =
    !!data.meta?.showPhoto &&
    typeof hero.photoUrl === "string" &&
    hero.photoUrl.startsWith("data:image/");

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
        <View style={s.headerTop}>
          <View style={s.headerText}>
            {hero.name ? <Text style={s.name}>{breakable(hero.name)}</Text> : null}
            {hero.headline ? <Text style={[s.headline, { color: accent }]}>{breakable(hero.headline)}</Text> : null}
            {contacts.length > 0 ? (
              <View style={s.contactRow}>
                {contacts.map((c, i) => (
                  <Text key={i} style={s.contactItem}>
                    {breakable(c)}
                    {i < contacts.length - 1 ? <Text style={{ color: accent }}>{"  ·  "}</Text> : ""}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
          {showPhoto ? (
            <View style={s.photoWrap}>
              {/* react-pdf Image não é <img> HTML (não tem alt). */}
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={hero.photoUrl} style={s.photo} />
            </View>
          ) : null}
        </View>
        <View style={s.headerDivider}>
          <View style={[s.headerBar, { backgroundColor: accent }]} />
          <View style={s.headerLine} />
        </View>

        {/* SEÇÕES — ordem e visibilidade vêm de meta.sectionOrder / hiddenSections. */}
        {(() => {
          const hidden = new Set(data.meta?.hiddenSections ?? []);
          const nodes: Record<ResumeSectionKey, React.ReactNode> = {
            summary: summaryText ? (
              <View key="summary" style={s.section}>
                <SectionTitle accent={accent}>{t.summary}</SectionTitle>
                <Text style={s.summaryText}>{summaryText}</Text>
              </View>
            ) : null,

            experience: experience.length > 0 ? (
              <View key="experience" style={s.section}>
                <SectionTitle accent={accent}>{t.experience}</SectionTitle>
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
                        <Bullet key={i} text={a} accent={accent} />
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
            ) : null,

            projects: projects.length > 0 ? (
              <View key="projects" style={s.section}>
                <SectionTitle accent={accent}>{t.projects}</SectionTitle>
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
            ) : null,

            education: education.length > 0 ? (
              <View key="education" style={s.section}>
                <SectionTitle accent={accent}>{t.education}</SectionTitle>
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
            ) : null,

            skills: hasSkills ? (
              <View key="skills" style={s.section}>
                <SectionTitle accent={accent}>{t.skills}</SectionTitle>
                <View style={s.skillGrid}>
                  {[
                    skills.languages.length > 0 ? { label: t.langs, value: skills.languages.map((x) => x.name).join(", ") } : null,
                    skills.frameworks.length > 0 ? { label: t.frameworks, value: skills.frameworks.map((x) => x.name).join(", ") } : null,
                    skills.tools.length > 0 ? { label: t.tools, value: skills.tools.map((x) => x.name).join(", ") } : null,
                    skills.softSkills.length > 0 ? { label: t.soft, value: skills.softSkills.join(", ") } : null,
                  ]
                    .filter((g): g is { label: string; value: string } => g !== null)
                    .map((g) => (
                      <View key={g.label} style={s.skillCell} wrap={false}>
                        <Text>
                          <Text style={s.skillLabel}>{g.label}: </Text>
                          <Text style={s.skillValue}>{g.value}</Text>
                        </Text>
                      </View>
                    ))}
                </View>
              </View>
            ) : null,

            certifications: certifications.length > 0 ? (
              <View key="certifications" style={s.section}>
                <SectionTitle accent={accent}>{t.certifications}</SectionTitle>
                {certifications.map((c) => {
                  const sub = [c.issuer, c.date].filter(Boolean).join(" · ");
                  return (
                    <View key={c.id} style={{ marginBottom: 9 }} wrap={false}>
                      <Text style={{ fontSize: 9.5, fontWeight: 600, color: pdfTheme.ink }}>{c.name}</Text>
                      {sub ? <Text style={s.metaLine}>{sub}</Text> : null}
                    </View>
                  );
                })}
              </View>
            ) : null,

            languages: languages.length > 0 ? (
              <View key="languages" style={s.section}>
                <SectionTitle accent={accent}>{t.languages}</SectionTitle>
                <Text style={s.skillValue}>
                  {languages.map((l) => `${l.name}${l.level ? ` (${l.level})` : ""}`).join("  ·  ")}
                </Text>
              </View>
            ) : null,
          };

          return resolveSectionOrder(data.meta?.sectionOrder)
            .filter((k) => !hidden.has(k))
            .map((k) => nodes[k]);
        })()}

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

/* ============================================================================
   TEMPLATE "MODERNO" — barra lateral (foto/contato/skills/idiomas) + coluna
   principal (nome/resumo/experiência/projetos/formação/certificações).
   A banda lateral é `fixed` (repete como margem colorida); o conteúdo da
   sidebar é absoluto (página 1). O conteúdo principal flui e pagina normal.
   ============================================================================ */

const SIDEBAR_W = 190;

const m = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 46,
    paddingLeft: SIDEBAR_W + 22,
    paddingRight: 40,
    fontSize: 10,
    fontFamily: "Geist",
    fontWeight: 400,
    color: pdfTheme.body,
    lineHeight: 1.5,
    backgroundColor: pdfTheme.white,
  },
  band: { position: "absolute", left: 0, top: 0, bottom: 0, width: SIDEBAR_W },
  sidebar: { position: "absolute", left: 0, top: 40, width: SIDEBAR_W, paddingHorizontal: 20 },

  avatarWrap: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 2,
    overflow: "hidden", alignItems: "center", justifyContent: "center",
    backgroundColor: pdfTheme.white,
  },
  avatarImg: { width: 88, height: 88, objectFit: "cover" },
  avatarInitials: { fontSize: 32, fontWeight: 700 },

  sideBlock: { marginBottom: 15 },
  sideTitle: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  sideText: { fontSize: 8.5, color: pdfTheme.body, marginBottom: 3.5, lineHeight: 1.4 },
  sideLabel: { fontSize: 8.5, fontWeight: 700, color: pdfTheme.ink, marginTop: 5 },
  sideValue: { fontSize: 8.5, color: pdfTheme.body, lineHeight: 1.45 },

  name: { fontSize: 24, fontWeight: 700, color: pdfTheme.ink, letterSpacing: -0.5 },
  headline: { fontSize: 11, fontWeight: 600, marginTop: 4, marginBottom: 16 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 },
  sectionRule: { flexDirection: "row", alignItems: "center", height: 2, marginBottom: 11 },
  sectionBar: { height: 2, width: 24, borderRadius: 1 },
  sectionLine: { height: 1, flexGrow: 1, backgroundColor: pdfTheme.border, marginLeft: 5 },

  item: { marginBottom: 13 },
  itemHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemTitle: { fontSize: 10.5, fontWeight: 700, color: pdfTheme.ink, flex: 1, paddingRight: 8 },
  itemDates: { fontSize: 8.5, fontWeight: 500, color: pdfTheme.muted, textAlign: "right" },
  itemSub: { fontSize: 9, fontWeight: 600, color: pdfTheme.body, marginTop: 2.5 },
  itemText: { fontSize: 9, color: pdfTheme.body, marginTop: 4, lineHeight: 1.5 },
  bulletRow: { flexDirection: "row", marginTop: 4, paddingRight: 4 },
  bulletDot: { fontSize: 9, width: 12 },
  bulletText: { fontSize: 9, color: pdfTheme.body, flex: 1, lineHeight: 1.45 },
  metaLine: { fontSize: 8.5, color: pdfTheme.muted, marginTop: 4 },
  metaLabel: { fontWeight: 600, color: pdfTheme.body },
  summary: { fontSize: 9.5, color: pdfTheme.body, lineHeight: 1.55, textAlign: "left" },

  footer: {
    position: "absolute", bottom: 22, left: SIDEBAR_W + 22, right: 40,
    textAlign: "center", fontSize: 7.5, color: pdfTheme.faint,
  },
});

function MSectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <View minPresenceAhead={44} wrap={false}>
      <Text style={[m.sectionTitle, { color: accent }]}>{children}</Text>
      <View style={m.sectionRule}>
        <View style={[m.sectionBar, { backgroundColor: accent }]} />
        <View style={m.sectionLine} />
      </View>
    </View>
  );
}

function ModernResume({ data, locale }: ResumePdfProps) {
  const t = dictFor(locale);
  const size = (locale ?? "pt-BR") === "en-US" ? "LETTER" : "A4";
  const { hero, about, experience, projects, education, skills, certifications, languages } = data;
  const accent = resolveAccent(data.meta?.accentColor);
  const hidden = new Set(data.meta?.hiddenSections ?? []);

  const summaryText = about.short || about.long;
  const initials = (hero.name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const showPhoto =
    !!data.meta?.showPhoto && typeof hero.photoUrl === "string" && hero.photoUrl.startsWith("data:image/");

  const contacts: string[] = [];
  if (hero.email) contacts.push(hero.email);
  if (hero.phone) contacts.push(hero.phone);
  if (hero.location) contacts.push(hero.location);
  if (hero.website) contacts.push(hero.website);
  if (hero.socials?.linkedin) contacts.push(hero.socials.linkedin.replace(/^https?:\/\/(www\.)?/, ""));
  if (hero.socials?.github) contacts.push(hero.socials.github.replace(/^https?:\/\/(www\.)?/, ""));

  const skillGroups = [
    skills.languages.length > 0 ? { label: t.langs, value: skills.languages.map((x) => x.name).join(", ") } : null,
    skills.frameworks.length > 0 ? { label: t.frameworks, value: skills.frameworks.map((x) => x.name).join(", ") } : null,
    skills.tools.length > 0 ? { label: t.tools, value: skills.tools.map((x) => x.name).join(", ") } : null,
    skills.softSkills.length > 0 ? { label: t.soft, value: skills.softSkills.join(", ") } : null,
  ].filter((g): g is { label: string; value: string } => g !== null);
  const hasSkills = skillGroups.length > 0;

  // Seções da COLUNA PRINCIPAL — respeitam ordem/visibilidade (skills/idiomas ficam na sidebar).
  const mainNodes: Partial<Record<ResumeSectionKey, React.ReactNode>> = {
    summary: summaryText ? (
      <View key="summary" style={m.section}>
        <MSectionTitle accent={accent}>{t.summary}</MSectionTitle>
        <Text style={m.summary}>{summaryText}</Text>
      </View>
    ) : null,
    experience: experience.length > 0 ? (
      <View key="experience" style={m.section}>
        <MSectionTitle accent={accent}>{t.experience}</MSectionTitle>
        {experience.map((exp) => {
          const dates = [exp.startDate, exp.endDate].filter(Boolean).join(" – ");
          const sub = [exp.company, exp.location].filter(Boolean).join(" · ");
          return (
            <View key={exp.id} style={m.item} wrap={false} minPresenceAhead={30}>
              <View style={m.itemHead}>
                <Text style={m.itemTitle}>{exp.role || exp.company}</Text>
                {dates ? <Text style={m.itemDates}>{dates}</Text> : null}
              </View>
              {sub ? <Text style={m.itemSub}>{sub}</Text> : null}
              {exp.summary ? <Text style={m.itemText}>{exp.summary}</Text> : null}
              {exp.achievements.filter(Boolean).map((a, i) => (
                <View key={i} style={m.bulletRow}>
                  <Text style={[m.bulletDot, { color: accent }]}>•</Text>
                  <Text style={m.bulletText}>{a}</Text>
                </View>
              ))}
              {exp.stack.length > 0 ? (
                <Text style={m.metaLine}><Text style={m.metaLabel}>{t.stack}: </Text>{exp.stack.join(", ")}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    ) : null,
    projects: projects.length > 0 ? (
      <View key="projects" style={m.section}>
        <MSectionTitle accent={accent}>{t.projects}</MSectionTitle>
        {projects.map((p) => {
          const desc = [p.problem, p.solution, p.impact].filter(Boolean).join(" ");
          const link = p.liveLink || p.repoLink;
          return (
            <View key={p.id} style={m.item} wrap={false} minPresenceAhead={30}>
              <View style={m.itemHead}>
                <Text style={m.itemTitle}>{p.title}</Text>
                {p.duration ? <Text style={m.itemDates}>{p.duration}</Text> : null}
              </View>
              {p.role ? <Text style={m.itemSub}>{p.role}</Text> : null}
              {desc ? <Text style={m.itemText}>{desc}</Text> : null}
              {link ? <Text style={m.metaLine}>{breakable(link.replace(/^https?:\/\/(www\.)?/, ""))}</Text> : null}
              {p.stack.length > 0 ? (
                <Text style={m.metaLine}><Text style={m.metaLabel}>{t.stack}: </Text>{p.stack.join(", ")}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    ) : null,
    education: education.length > 0 ? (
      <View key="education" style={m.section}>
        <MSectionTitle accent={accent}>{t.education}</MSectionTitle>
        {education.map((edu) => (
          <View key={edu.id} style={m.item} wrap={false} minPresenceAhead={24}>
            <View style={m.itemHead}>
              <Text style={m.itemTitle}>{edu.institution}</Text>
              {edu.dates ? <Text style={m.itemDates}>{edu.dates}</Text> : null}
            </View>
            {edu.degree ? <Text style={m.itemSub}>{edu.degree}</Text> : null}
          </View>
        ))}
      </View>
    ) : null,
    certifications: certifications.length > 0 ? (
      <View key="certifications" style={m.section}>
        <MSectionTitle accent={accent}>{t.certifications}</MSectionTitle>
        {certifications.map((c) => {
          const sub = [c.issuer, c.date].filter(Boolean).join(" · ");
          return (
            <View key={c.id} style={{ marginBottom: 8 }} wrap={false}>
              <Text style={{ fontSize: 9.5, fontWeight: 600, color: pdfTheme.ink }}>{c.name}</Text>
              {sub ? <Text style={m.metaLine}>{sub}</Text> : null}
            </View>
          );
        })}
      </View>
    ) : null,
  };

  const mainOrder = resolveSectionOrder(data.meta?.sectionOrder).filter(
    (k) => k !== "skills" && k !== "languages" && !hidden.has(k)
  );

  return (
    <Document title={`Currículo — ${hero.name || "Sem nome"}`} author={hero.name || undefined}>
      <Page size={size} style={m.page} wrap>
        {/* Banda lateral colorida (accent suave) — repete como margem em todas as páginas. */}
        <View fixed style={[m.band, { backgroundColor: accent, opacity: 0.08 }]} />

        {/* Conteúdo da sidebar (página 1). */}
        <View style={m.sidebar}>
          <View style={m.avatarWrap}>
            <View style={[m.avatar, { borderColor: accent }]}>
              {showPhoto ? (
                // react-pdf Image não é <img> HTML (não tem alt).
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={hero.photoUrl} style={m.avatarImg} />
              ) : (
                <Text style={[m.avatarInitials, { color: accent }]}>{initials}</Text>
              )}
            </View>
          </View>

          {contacts.length > 0 ? (
            <View style={m.sideBlock}>
              <Text style={[m.sideTitle, { color: accent }]}>{locale === "en-US" ? "Contact" : "Contato"}</Text>
              {contacts.map((c, i) => (
                <Text key={i} style={m.sideText}>{breakable(c)}</Text>
              ))}
            </View>
          ) : null}

          {hasSkills && !hidden.has("skills") ? (
            <View style={m.sideBlock}>
              <Text style={[m.sideTitle, { color: accent }]}>{t.skills}</Text>
              {skillGroups.map((g) => (
                <View key={g.label}>
                  <Text style={m.sideLabel}>{g.label}</Text>
                  <Text style={m.sideValue}>{g.value}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {languages.length > 0 && !hidden.has("languages") ? (
            <View style={m.sideBlock}>
              <Text style={[m.sideTitle, { color: accent }]}>{t.languages}</Text>
              {languages.map((l) => (
                <Text key={l.id} style={m.sideText}>
                  {l.name}{l.level ? ` — ${l.level}` : ""}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        {/* Coluna principal. */}
        <View>
          {hero.name ? <Text style={m.name}>{breakable(hero.name)}</Text> : null}
          {hero.headline ? <Text style={[m.headline, { color: accent }]}>{breakable(hero.headline)}</Text> : null}
        </View>
        {mainOrder.map((k) => mainNodes[k])}

        <Text style={m.footer} fixed render={({ pageNumber, totalPages }) => t.page(pageNumber, totalPages)} />
      </Page>
    </Document>
  );
}

export function ResumePdf({ data, locale, template }: ResumePdfProps) {
  const tmpl = data.meta?.template ?? template ?? "ats";
  return tmpl === "modern"
    ? <ModernResume data={data} locale={locale} />
    : <AtsResume data={data} locale={locale} />;
}

export default ResumePdf;
