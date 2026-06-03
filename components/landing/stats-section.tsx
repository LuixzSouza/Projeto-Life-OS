import { Boxes, BadgeDollarSign, Database, ShieldCheck } from "lucide-react";

// Números-âncora que resumem a proposta de valor do Life OS.
const STATS = [
  { icon: Boxes, value: "16", label: "Módulos integrados", hint: "Finanças, saúde, estudos, CRM e mais" },
  { icon: BadgeDollarSign, value: "R$0", label: "Mensalidade", hint: "Sem assinatura — pra sempre" },
  { icon: Database, value: "1", label: "Arquivo SQLite", hint: "Portátil e 100% seu" },
  { icon: ShieldCheck, value: "100%", label: "Local & privado", hint: "Open source, sem rastreio" },
];

export default function StatsSection() {
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-7xl">
        {/* Cabeçalho no padrão da landing (pill + h2 + subtítulo) */}
        <div className="mb-12 md:text-center max-w-3xl mx-auto">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <span className="size-1.5 rounded-full bg-primary" /> Por que Life OS
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2 tracking-tight">
            Feito para durar — e respeitar você
          </h2>
          <p className="text-muted-foreground text-lg">
            Sem mensalidade, sem nuvem obrigatória, sem letras miúdas.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map(({ icon: Icon, value, label, hint }) => (
            <div
              key={label}
              className="landing-card group relative overflow-hidden rounded-2xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_0_50px_-20px_var(--color-primary)]"
            >
              {/* Brilho sutil no topo ao passar o mouse */}
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>

              <p className="text-gradient-brand text-4xl font-bold tracking-tight">
                {value}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
