// components/marketing/doc.tsx
// Primitivos de tipografia para as páginas institucionais (privacy/terms/etc.).
// Server-safe (sem hooks), themeable e no accent.
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function DocHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  updated,
}: {
  icon?: LucideIcon;
  eyebrow: string;
  title: string;
  description?: string;
  updated?: string;
}) {
  return (
    <header className="mb-12 border-b border-border/60 pb-8">
      <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
        {Icon && <Icon className="size-3.5" />} {eyebrow}
      </span>
      <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">{title}</h1>
      {description && <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{description}</p>}
      {updated && (
        <p className="mt-4 font-mono text-xs text-muted-foreground">Última atualização: {updated}</p>
      )}
    </header>
  );
}

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export function DocList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
