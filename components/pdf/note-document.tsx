// Documento PDF de uma Nota do Life OS.
// Converte o Markdown em blocos (títulos, listas, citações, código, imagens) com a marca.
import React from "react";
import { StyleSheet, Image } from "@react-pdf/renderer";
import {
  Document, View, Text, BrandedPage, PageTitle, Kpi, pdf as base, pdfTheme,
} from "./pdf-kit";

export interface NoteDocumentProps {
  title: string;
  generatedAt: string;
  content: string;       // Markdown já com imagens reincorporadas (data:base64)
  notebook?: string | null;
  project?: string | null;
  tags?: string[];
}

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; text: string }
  | { type: "ol"; num: number; text: string }
  | { type: "task"; checked: boolean; text: string }
  | { type: "quote"; text: string }
  | { type: "code"; text: string }
  | { type: "hr" }
  | { type: "img"; src: string }
  | { type: "table"; headers: string[]; rows: string[][] };

const isTableLine = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableSeparator = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");
function splitRow(l: string): string[] {
  return l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

// Remove marcadores inline → texto puro (usado em títulos, que já são bold).
function inlineText(t: string): string {
  return t
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/~~(.*?)~~/g, "$2")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

type Seg = { text: string; bold?: boolean; italic?: boolean; code?: boolean; strike?: boolean };

// Quebra o texto em segmentos com estilo (negrito/itálico/código/tachado).
function parseInline(input: string): Seg[] {
  const t = input.replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const segs: Seg[] = [];
  const re = /(\*\*|__)(.+?)\1|(\*|_)(.+?)\3|~~(.+?)~~|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    if (m.index > last) segs.push({ text: t.slice(last, m.index) });
    if (m[1]) segs.push({ text: m[2], bold: true });
    else if (m[3]) segs.push({ text: m[4], italic: true });
    else if (m[5] !== undefined) segs.push({ text: m[5], strike: true });
    else if (m[6] !== undefined) segs.push({ text: m[6], code: true });
    last = re.lastIndex;
  }
  if (last < t.length) segs.push({ text: t.slice(last) });
  return segs.length ? segs : [{ text: t }];
}

// Renderiza texto com formatação inline dentro de um <Text> base.
function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((seg, i) => {
        const style: Record<string, string | number> = {};
        if (seg.bold) style.fontFamily = "Helvetica-Bold";
        else if (seg.italic) style.fontFamily = "Helvetica-Oblique";
        if (seg.code) { style.fontFamily = "Courier"; style.color = pdfTheme.primary; }
        if (seg.strike) style.textDecoration = "line-through";
        return <Text key={i} style={style}>{seg.text}</Text>;
      })}
    </>
  );
}

function parseBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => { if (para.length) { blocks.push({ type: "p", text: para.join(" ") }); para = []; } };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      flush();
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { code.push(lines[i]); i++; }
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    // Tabela: linha "| … |" seguida da linha separadora "| --- | --- |".
    if (isTableLine(line) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flush();
      const headers = splitRow(line);
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && isTableLine(lines[j])) { rows.push(splitRow(lines[j])); j++; }
      blocks.push({ type: "table", headers, rows });
      i = j - 1;
      continue;
    }
    const img = line.match(/^!\[[^\]]*\]\(([^)]+)\)\s*$/);
    if (img) { flush(); blocks.push({ type: "img", src: img[1] }); continue; }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); blocks.push({ type: "hr" }); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flush(); blocks.push({ type: "h", level: h[1].length, text: inlineText(h[2]) }); continue; }
    const task = line.match(/^\s*[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (task) { flush(); blocks.push({ type: "task", checked: task[1].toLowerCase() === "x", text: task[2] }); continue; }
    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) { flush(); blocks.push({ type: "ul", text: bullet[1] }); continue; }
    const ol = line.match(/^\s*(\d+)\.\s+(.*)$/);
    if (ol) { flush(); blocks.push({ type: "ol", num: Number(ol[1]), text: ol[2] }); continue; }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) { flush(); blocks.push({ type: "quote", text: quote[1] }); continue; }
    if (line.trim() === "") { flush(); continue; }
    para.push(line.trim());
  }
  flush();
  return blocks;
}

// O react-pdf só renderiza PNG/JPEG com segurança; demais formatos viram aviso.
function isRenderableImage(src: string): boolean {
  return /^data:image\/(png|jpe?g)/i.test(src);
}

const s = StyleSheet.create({
  h1: { fontSize: 17, fontFamily: "Helvetica-Bold", color: pdfTheme.ink, marginTop: 12, marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: "Helvetica-Bold", color: pdfTheme.ink, marginTop: 10, marginBottom: 5 },
  h3: { fontSize: 12, fontFamily: "Helvetica-Bold", color: pdfTheme.ink, marginTop: 8, marginBottom: 4 },
  p: { fontSize: 10, color: pdfTheme.body, lineHeight: 1.6, marginBottom: 6 },
  li: { flexDirection: "row", marginBottom: 3, paddingLeft: 6 },
  liBullet: { width: 14, fontSize: 10, color: pdfTheme.primary },
  liText: { flex: 1, fontSize: 10, color: pdfTheme.body, lineHeight: 1.5 },
  quote: {
    borderLeftWidth: 3, borderLeftColor: pdfTheme.primary, backgroundColor: pdfTheme.bgSoft,
    paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6,
  },
  quoteText: { fontSize: 10, color: pdfTheme.muted, fontStyle: "italic", lineHeight: 1.5 },
  code: {
    backgroundColor: "#0F172A", color: "#E2E8F0", borderRadius: 6, padding: 10,
    fontFamily: "Courier", fontSize: 9, lineHeight: 1.5, marginBottom: 8,
  },
  hr: { borderBottomWidth: 1, borderBottomColor: pdfTheme.border, marginVertical: 10 },
  image: { width: "100%", borderRadius: 6, marginBottom: 8, objectFit: "contain" },
  imageCaption: { fontSize: 7.5, color: pdfTheme.faint, marginBottom: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 12 },
  chip: { fontSize: 8.5, color: pdfTheme.primary, backgroundColor: pdfTheme.primarySoft, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },

  table: { borderWidth: 1, borderColor: pdfTheme.border, borderRadius: 6, marginBottom: 10, overflow: "hidden" },
  tableRow: { flexDirection: "row" },
  tableHeadRow: { flexDirection: "row", backgroundColor: pdfTheme.bgSoft },
  tableCell: { flex: 1, fontSize: 9, color: pdfTheme.body, paddingVertical: 5, paddingHorizontal: 7, borderRightWidth: 1, borderRightColor: pdfTheme.line, lineHeight: 1.4 },
  tableCellHead: { fontFamily: "Helvetica-Bold", color: pdfTheme.ink },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: pdfTheme.line },
});

export function NoteDocument({ title, generatedAt, content, notebook, project, tags = [] }: NoteDocumentProps) {
  const blocks = parseBlocks(content);
  const imageCount = blocks.filter((b) => b.type === "img").length;
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  const subtitleBits = [notebook ? `Caderno: ${notebook}` : null, project ? `Projeto: ${project}` : null]
    .filter(Boolean).join("  •  ");

  return (
    <Document title={title} author="Life OS">
      <BrandedPage docTitle="Nota" headerMeta={generatedAt} footerNote={`Gerado em ${generatedAt}`}>
        <PageTitle title={title || "Nota sem título"} subtitle={subtitleBits || undefined} />

        <View style={base.kpiRow}>
          <Kpi label="Palavras" value={words.toLocaleString("pt-BR")} />
          <Kpi label="Imagens" value={String(imageCount)} accent={imageCount ? pdfTheme.primary : undefined} />
          <Kpi label="Caracteres" value={content.length.toLocaleString("pt-BR")} />
        </View>

        {tags.length > 0 ? (
          <View style={s.chipRow}>
            {tags.map((t, i) => <Text key={i} style={s.chip}>{t}</Text>)}
          </View>
        ) : null}

        {blocks.map((b, i) => {
          switch (b.type) {
            case "h":
              return <Text key={i} style={b.level === 1 ? s.h1 : b.level === 2 ? s.h2 : s.h3}>{b.text}</Text>;
            case "p":
              return <Text key={i} style={s.p}><Inline text={b.text} /></Text>;
            case "ul":
              return (
                <View key={i} style={s.li} wrap={false}>
                  <Text style={s.liBullet}>•</Text><Text style={s.liText}><Inline text={b.text} /></Text>
                </View>
              );
            case "ol":
              return (
                <View key={i} style={s.li} wrap={false}>
                  <Text style={s.liBullet}>{b.num}.</Text><Text style={s.liText}><Inline text={b.text} /></Text>
                </View>
              );
            case "task":
              return (
                <View key={i} style={s.li} wrap={false}>
                  <Text style={s.liBullet}>{b.checked ? "[x]" : "[ ]"}</Text><Text style={s.liText}><Inline text={b.text} /></Text>
                </View>
              );
            case "quote":
              return <View key={i} style={s.quote}><Text style={s.quoteText}><Inline text={b.text} /></Text></View>;
            case "code":
              return <Text key={i} style={s.code}>{b.text}</Text>;
            case "hr":
              return <View key={i} style={s.hr} />;
            case "table":
              return (
                <View key={i} style={s.table} wrap={false}>
                  <View style={s.tableHeadRow}>
                    {b.headers.map((h, c) => (
                      <Text key={c} style={[s.tableCell, s.tableCellHead]}><Inline text={h} /></Text>
                    ))}
                  </View>
                  {b.rows.map((row, r) => (
                    <View key={r} style={[s.tableRow, s.tableRowBorder]}>
                      {b.headers.map((_, c) => (
                        <Text key={c} style={s.tableCell}><Inline text={row[c] ?? ""} /></Text>
                      ))}
                    </View>
                  ))}
                </View>
              );
            case "img":
              return isRenderableImage(b.src)
                // eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf não tem prop alt
                ? <Image key={i} style={s.image} src={b.src} />
                : <Text key={i} style={s.imageCaption}>[imagem não suportada no PDF]</Text>;
            default:
              return null;
          }
        })}
      </BrandedPage>
    </Document>
  );
}
