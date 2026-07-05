import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";

// Domínio de produção (fonte única em config/site.config.ts). Sobrescreva com
// NEXT_PUBLIC_SITE_URL nas env vars do deploy.
const SITE_URL = siteConfig.urls.site;

// Só as páginas públicas e estáveis entram no sitemap: a landing e as
// institucionais do rodapé (grupo (marketing)). Rotas de auth, dashboard e
// links por token NÃO entram — são privadas ou efêmeras (ver app/robots.ts).
const PUBLIC_PATHS: ReadonlyArray<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/changelog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/privacy", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
