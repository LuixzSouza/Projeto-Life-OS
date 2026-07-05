/**
 * ============================================================================
 *  SITE CONFIG — Fonte única de verdade da MARCA / LOJA
 * ============================================================================
 *
 *  Este arquivo centraliza TUDO que muda de um cliente/loja para outro:
 *  nome, logo, contato, links, redes sociais, SEO e textos do rodapé.
 *
 *  ▶ Para clonar este template para uma nova loja, edite SÓ este arquivo
 *    (e `config/catalog.ts` para os produtos). Os componentes leem daqui.
 *
 *  Nada aqui é secreto — segredos (chaves de API, tokens) ficam em `.env`.
 *  Valores que mudam por ambiente (domínio) leem de `NEXT_PUBLIC_*`.
 * ============================================================================
 */

export interface SocialLinks {
  github?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  whatsapp?: string;
}

export interface SiteConfig {
  /** Identidade visual e nome. */
  brand: {
    /** Nome completo exibido (ex.: "Loja da Ana"). */
    name: string;
    /** Nome curto para telas apertadas / PWA. */
    shortName: string;
    /** Frase curta de posicionamento (aparece em headers). */
    tagline: string;
    /** Descrição de 1–2 frases (landing / meta description). */
    description: string;
    /** Caminho do logo em /public (ex.: "/logo.webp"). */
    logo: string;
    logoWidth: number;
    logoHeight: number;
    /** Rótulo de versão/estado exibido perto do logo (ex.: "v1.0"). */
    versionLabel: string;
  };

  /** Formas de contato. Deixe vazio ("") para ocultar. */
  contact: {
    email: string;
    /** Telefone só dígitos com DDI, ex.: "5511999999999" (para link wa.me). */
    whatsapp: string;
    /** Texto pré-preenchido ao abrir o WhatsApp. */
    whatsappMessage: string;
  };

  /** URLs importantes. Deixe "" para esconder o link relacionado. */
  urls: {
    /** Domínio canônico em produção (sem barra final). */
    site: string;
    /** Repositório de código (opcional — projetos open source). */
    repo: string;
    /** Página de apoio/patrocínio (GitHub Sponsors, Ko-fi, Pix…). */
    sponsor: string;
    /** Perfil pessoal/institucional do autor. */
    profile: string;
  };

  /** Redes sociais (cada uma é opcional). */
  socials: SocialLinks;

  /** Metadados de SEO / Open Graph. */
  seo: {
    /** Título completo para a home (og:title / <title> da landing). */
    title: string;
    description: string;
    keywords: string[];
    /** Imagem social em /public (1200×630 recomendado). */
    ogImage: string;
    /** Locale BCP-47 (ex.: "pt_BR"). */
    locale: string;
  };

  /** Textos do rodapé. */
  footer: {
    /** Quem detém o copyright (ex.: "Loja da Ana Ltda"). */
    copyrightHolder: string;
    /** Ano inicial; o rodapé mostra "ano–atual" se diferente do ano corrente. */
    startYear: number;
    /** Nome do autor/criador exibido em "Feito por …". */
    author: string;
    /** Licença ou nota curta (ex.: "Todos os direitos reservados."). */
    note: string;
  };

  /** Liga/desliga blocos opcionais da landing sem mexer no código. */
  features: {
    showNewsletter: boolean;
    showSponsorPlan: boolean;
    showGithubLinks: boolean;
  };
}

/** Domínio de produção — sobrescreva com NEXT_PUBLIC_SITE_URL no deploy. */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://life-os.vercel.app";

/**
 * ▼▼▼  EDITE DAQUI PRA BAIXO AO CLONAR PARA UMA NOVA LOJA  ▼▼▼
 */
export const siteConfig: SiteConfig = {
  brand: {
    name: "Life OS",
    shortName: "Life OS",
    tagline: "Seu segundo cérebro, 100% local",
    description:
      "Centralize finanças, projetos, estudos, saúde e mais num único arquivo SQLite que é seu. Privacidade total, sem assinatura e sem nuvem obrigatória.",
    logo: "/logo.webp",
    logoWidth: 40,
    logoHeight: 40,
    versionLabel: "v1.0 Stable",
  },

  contact: {
    email: "luiz.antoniodesouza004@gmail.com",
    whatsapp: "",
    whatsappMessage: "Olá! Vim pelo site e gostaria de saber mais.",
  },

  urls: {
    site: SITE_URL,
    repo: "https://github.com/LuixzSouza/Projeto-Life-OS",
    sponsor: "https://github.com/sponsors/LuixzSouza",
    profile: "https://github.com/LuixzSouza",
  },

  socials: {
    github: "https://github.com/LuixzSouza",
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    tiktok: "",
    whatsapp: "",
  },

  seo: {
    title: "Life OS — Seu segundo cérebro, 100% local",
    description:
      "Centralize finanças, projetos, estudos, saúde e mais num único arquivo SQLite que é seu. Privacidade total, sem assinatura e sem nuvem obrigatória.",
    keywords: [
      "second brain",
      "segundo cérebro",
      "produtividade",
      "finanças pessoais",
      "privacidade",
      "local-first",
      "SQLite",
      "self-hosted",
      "Life OS",
    ],
    ogImage: "/logo.webp",
    locale: "pt_BR",
  },

  footer: {
    copyrightHolder: "Life OS",
    startYear: 2026,
    author: "Luiz Antônio",
    note: "Open source sob licença MIT.",
  },

  features: {
    showNewsletter: true,
    showSponsorPlan: true,
    showGithubLinks: true,
  },
};

/* --------------------------------------------------------------------------
 * Helpers derivados (não precisam ser editados).
 * ------------------------------------------------------------------------ */

/** Link `mailto:` pronto (ou "" se não houver e-mail). */
export function mailtoHref(subject?: string): string {
  const { email } = siteConfig.contact;
  if (!email) return "";
  const q = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${q}`;
}

/** Link `wa.me` pronto com mensagem (ou "" se não houver WhatsApp). */
export function whatsappHref(): string {
  const { whatsapp, whatsappMessage } = siteConfig.contact;
  if (!whatsapp) return "";
  const text = whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : "";
  return `https://wa.me/${whatsapp}${text}`;
}

/** "2026" ou "2026–2027" conforme o ano corrente. */
export function copyrightRange(): string {
  const now = new Date().getFullYear();
  const start = siteConfig.footer.startYear;
  return now > start ? `${start}–${now}` : `${start}`;
}
