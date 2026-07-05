import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site.config";

// Domínio de produção (fonte única em config/site.config.ts). Sobrescreva com
// NEXT_PUBLIC_SITE_URL nas env vars do deploy.
const SITE_URL = siteConfig.urls.site;

// robots.txt gerado pelo Next. Filosofia privacy-first: só a landing e as
// páginas institucionais do rodapé são rastreáveis. Tudo que é dado de usuário,
// autenticação ou link assinado por token fica FORA dos buscadores — mesmo as
// rotas "públicas" por token (aniversário, cofre compartilhado, share) não devem
// vazar para o índice do Google.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/api/",
        "/login",
        "/register",
        "/setup",
        "/celebrar/",
        "/cofre-compartilhado",
        "/share",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
