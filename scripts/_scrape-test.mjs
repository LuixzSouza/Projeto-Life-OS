import * as cheerio from "cheerio";

const clean = (s, max = 4000) => (s ? s.replace(/\s+/g, " ").trim().slice(0, max) || undefined : undefined);
const SECTION_RE = /^(requirements?|responsibilities|qualifications|about( the)?( role| company| job)?|benefits|nice to have|what you.?ll do|role overview|who you are|requisitos|responsabilidades|qualifica[çc][õo]es|sobre( a vaga| a empresa)?|benef[íi]cios|diferenciais|atividades|o que (voc[êe]|esperamos))\s*:?\s*$/i;
function toNotesMarkdown(raw, max = 4000) {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/[ \t]+/g, " ").trimEnd());
  const out = [];
  for (let line of lines) {
    const t = line.trim();
    if (!t) { out.push(""); continue; }
    if (SECTION_RE.test(t)) { out.push("", `## ${t.replace(/:\s*$/, "")}`, ""); continue; }
    line = t.replace(/^[•·▪◦‣∙*]\s+/, "- ").replace(/^[–—]\s+/, "- ").replace(/^-\s+/, "- ");
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}
function htmlToNotes(input) {
  let html = input || "";
  if (!html) return "";
  if (/&lt;|&gt;/.test(html)) html = cheerio.load(html).root().text();
  const wb = html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\s*li[^>]*>/gi, "\n- ").replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, "\n");
  return cheerio.load(wb).root().text();
}
const prettify = (s) => (s ? s.replace(/[-_]+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase()) : undefined);
function deriveBoardCompany(target) {
  const host = target.hostname.toLowerCase();
  const seg = target.pathname.split("/").filter(Boolean);
  for (const b of ["gupy.io", "recruitee.com", "breezy.hr", "factorialhr.com", "solides.com.br"]) {
    if (host.endsWith("." + b)) {
      const sub = host.slice(0, host.length - b.length - 1).split(".").pop();
      if (sub && !["www", "portal", "app", "jobs", "careers"].includes(sub)) return prettify(sub);
    }
  }
  if (["greenhouse.io", "lever.co", "ashbyhq.com", "workable.com", "jobvite.com", "smartrecruiters.com"].some((b) => host.includes(b)) && seg[0] && !["jobs", "careers", "company", "o"].includes(seg[0].toLowerCase())) return prettify(seg[0]);
  return undefined;
}
function sameCompany(a, b) {
  if (!a || !b) return false;
  const n = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return !!n(a) && !!n(b) && (n(a) === n(b) || n(a).includes(n(b)) || n(b).includes(n(a)));
}
function stripPortal(s) {
  if (!s) return s;
  return s.replace(/\s*[|·—–-]\s*(LinkedIn|Apply on Job|Indeed|Glassdoor|Gupy|Vagas?|Job Portal|Greenhouse|Lever|Recruitee|Workable|SmartRecruiters).*$/i, "").replace(/\s+(Job Portal|Careers?|Vagas)\s*$/i, "").replace(/^(P[áa]gina da Vaga|Job Page)\s*[|:—–-]\s*/i, "").trim() || s;
}

async function scrape(url) {
  const target = new URL(url);
  const c = new AbortController();
  const to = setTimeout(() => c.abort(), 9000);
  let html;
  try {
    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LifeOS/1.0)" }, signal: c.signal });
    if (!res.ok) return { error: `status ${res.status}` };
    html = await res.text();
  } catch (e) { return { error: e.name === "AbortError" ? "timeout" : e.message }; } finally { clearTimeout(to); }

  const $ = cheerio.load(html);
  const data = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    if (data.role && data.company) return;
    try {
      const json = JSON.parse($(el).contents().text());
      const nodes = Array.isArray(json) ? json : json["@graph"] ?? [json];
      for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
        const t = node?.["@type"];
        if (!(t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting")))) continue;
        data.role ??= clean(node.title, 200);
        const org = node.hiringOrganization;
        data.company ??= clean(typeof org === "string" ? org : org?.name, 200);
        const jl = Array.isArray(node.jobLocation) ? node.jobLocation[0] : node.jobLocation;
        const loc = jl?.address?.addressLocality ?? jl?.address?.addressRegion;
        data.location ??= clean(typeof loc === "string" ? loc : undefined, 120);
        if (node.baseSalary?.value) {
          const v = node.baseSalary.value;
          const amt = v.value ?? (v.minValue && v.maxValue ? `${v.minValue}–${v.maxValue}` : v.minValue ?? v.maxValue);
          if (amt) data.salary ??= clean(`${amt} ${node.baseSalary.currency ?? ""}`, 60);
        }
        if (node.description) data.requirements ??= toNotesMarkdown(htmlToNotes(node.description), 4000);
      }
    } catch {}
  });

  if (target.hostname.toLowerCase().includes("linkedin.com")) {
    const og = $('meta[property="og:title"]').attr("content") || $("title").first().text() || "";
    const wl = og.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)\s*(?:\||$)/i);
    const nl = og.match(/^(.+?)\s+hiring\s+(.+?)\s*(?:\||$)/i);
    if (wl) { data.company ||= clean(wl[1], 200); data.role = clean(wl[2], 200); data.location ||= clean(wl[3], 120); }
    else if (nl) { data.company ||= clean(nl[1], 200); data.role = clean(nl[2], 200); }
    const $d = $(".show-more-less-html__markup").first().length ? $(".show-more-less-html__markup").first() : $(".description__text").first();
    const md = toNotesMarkdown(htmlToNotes($d.html()), 4000);
    if (md) data.requirements = md;
  }

  const boardCompany = deriveBoardCompany(target);
  const ogTitle = clean($('meta[property="og:title"]').attr("content") || $("title").first().text(), 200);
  if (!data.role && ogTitle && !sameCompany(ogTitle, boardCompany)) data.role = ogTitle;
  data.requirements ??= clean($('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content"), 4000);
  if (!data.company) {
    const siteName = clean($('meta[property="og:site_name"]').attr("content"), 200);
    data.company = boardCompany ?? (ogTitle && sameCompany(ogTitle, boardCompany) ? ogTitle : undefined) ?? (siteName && !sameCompany(siteName, data.role) ? siteName : undefined);
    if (boardCompany && ogTitle && sameCompany(ogTitle, boardCompany)) data.company = ogTitle;
  }
  data.role = stripPortal(data.role);
  data.company = stripPortal(data.company);
  return data;
}

for (const u of process.argv.slice(2)) {
  const d = await scrape(u);
  console.log("\n===", new URL(u).hostname + new URL(u).pathname.slice(0, 24), "===");
  if (d.error) { console.log("  ERRO:", d.error); continue; }
  console.log("  empresa :", d.company ?? "—");
  console.log("  cargo   :", d.role ?? "—");
  console.log("  local   :", d.location ?? "—");
  console.log("  salário :", d.salary ?? "—");
  console.log("  notas   :", (d.requirements ?? "—").replace(/\n/g, " ⏎ ").slice(0, 150));
}
