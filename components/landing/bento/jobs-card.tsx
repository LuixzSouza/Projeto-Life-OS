"use client";

import { ClipboardList, Send, Users, CheckCircle2, FileUser } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { Pill } from "./bento-atoms";

// model JobApplication: company, role, status, salary, location.
interface App {
  company: string;
  role: string;
  status: string;
  icon: LucideIcon;
}

const APPS: App[] = [
  { company: "Vercel", role: "Frontend Engineer", status: "Entrevista", icon: Users },
  { company: "Linear", role: "Product Engineer", status: "Aplicado", icon: Send },
  { company: "Stripe", role: "Fullstack Dev", status: "Oferta", icon: CheckCircle2 },
];

export function JobsCard() {
  return (
    <BaseCard
      title="Vagas"
      icon={ClipboardList}
      description="Candidaturas e currículo."
      className="col-span-1 min-h-[260px]"
    >
      <div className="flex h-full w-full flex-col p-4">
        {/* Resumo do funil */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold tracking-tight text-foreground">12</span>
            <span className="ml-1 text-[11px] text-muted-foreground">candidaturas</span>
          </div>
          <Pill icon={Users}>3 entrevistas</Pill>
        </div>

        {/* Pipeline de candidaturas */}
        <div className="flex flex-1 flex-col gap-2">
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              <div
                key={app.company}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 transition-colors hover:border-primary/30"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                  {app.company[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{app.role}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{app.company}</p>
                </div>
                <Pill icon={Icon}>{app.status}</Pill>
              </div>
            );
          })}
        </div>

        {/* Currículo / Portfolio builder */}
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-2">
          <FileUser className="size-4 shrink-0 text-primary" />
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold text-foreground">Currículo</span> gerado do seu perfil.
          </p>
        </div>
      </div>
    </BaseCard>
  );
}
