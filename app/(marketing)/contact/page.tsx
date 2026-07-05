import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Github, Bug, MessageCircle, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DocHeader } from "@/components/marketing/doc";
import { siteConfig, mailtoHref } from "@/config/site.config";

export const metadata: Metadata = {
  title: "Contato",
  description: `Fale com o time do ${siteConfig.brand.name} — e-mail, GitHub e issues.`,
};

const REPO = siteConfig.urls.repo;

interface Channel {
  icon: LucideIcon;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
}

const CHANNELS: Channel[] = [
  {
    icon: Mail,
    title: "E-mail",
    description: "Para dúvidas, parcerias ou suporte direto.",
    cta: siteConfig.contact.email,
    href: mailtoHref(),
  },
  {
    icon: Bug,
    title: "Reportar um bug",
    description: "Encontrou um problema? Abra uma issue no repositório.",
    cta: "GitHub Issues",
    href: `${REPO}/issues`,
    external: true,
  },
  {
    icon: Github,
    title: "Repositório",
    description: "Veja o código, contribua ou deixe uma estrela.",
    cta: "Projeto-Life-OS",
    href: REPO,
    external: true,
  },
  {
    icon: MessageCircle,
    title: "Dúvidas frequentes",
    description: "Boa parte das perguntas já está respondida na landing.",
    cta: "Ver FAQ",
    href: "/#faq",
  },
];

export default function ContactPage() {
  return (
    <article>
      <DocHeader
        icon={Mail}
        eyebrow="Contato"
        title="Vamos conversar"
        description="Projeto open source mantido por uma pessoa — o canal mais rápido é o GitHub ou o e-mail."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {CHANNELS.map((c) => {
          const Icon = c.icon;
          const inner = (
            <>
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                <Icon className="size-5" />
              </div>
              <h2 className="flex items-center gap-1 text-base font-bold text-foreground">
                {c.title}
                <ArrowUpRight className="size-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.description}</p>
              <span className="mt-3 inline-block truncate text-xs font-medium text-primary">{c.cta}</span>
            </>
          );

          const className =
            "group rounded-2xl border border-border/60 bg-card/40 p-5 transition-all hover:border-primary/30 hover:bg-card/70";

          return c.external ? (
            <a key={c.title} href={c.href} target="_blank" rel="noreferrer" className={className}>
              {inner}
            </a>
          ) : (
            <Link key={c.title} href={c.href} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </article>
  );
}
