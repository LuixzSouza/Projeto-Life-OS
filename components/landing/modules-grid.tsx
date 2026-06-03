"use client";

import { LayoutGrid } from "lucide-react";

// Central
import { OverviewCard } from "./bento/overview-card";
import { AgendaCard } from "./bento/agenda-card";
import { AICard } from "./bento/ai-card";
// Profissional
import { ProjectsCard } from "./bento/projects-card";
import { JobsCard } from "./bento/jobs-card";
import { BusinessCard } from "./bento/business-card";
import { FinanceCard } from "./bento/finance-card";
// Pessoal
import { HealthCard } from "./bento/health-card";
import { StudiesCard } from "./bento/studies-card";
import { EntertainmentCard } from "./bento/entertainment-card";
import { ClosetCard } from "./bento/closet-card";
import { ConnectionsCard } from "./bento/connections-card";
// Sistema
import { CMSCard } from "./bento/cms-card";
import { LinksCard } from "./bento/links-card";
import { VaultCard } from "./bento/vault-card";
import { SettingsCard } from "./bento/settings-card";

export default function ModulesGrid() {
  return (
    <section id="modules" className="relative overflow-hidden border-t border-border/60 px-4 py-24">
      {/* fundo themeable */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)]" />
      <div className="pointer-events-none absolute left-1/2 top-10 h-[420px] w-full max-w-4xl -translate-x-1/2 rounded-full bg-primary/10 blur-[130px]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl md:text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <LayoutGrid className="size-3.5" /> 16 módulos integrados
          </span>
          <h2 className="mb-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Ecossistema Completo
          </h2>
          <p className="text-lg text-muted-foreground">
            Da rotina ao negócio — tudo o que o Life OS faz, num só lugar.
          </p>
        </div>

        {/*
          Bento na ordem dos grupos da sidebar real:
          Central · Profissional · Pessoal · Sistema.
        */}
        <div className="grid auto-rows-[minmax(160px,auto)] grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {/* Central */}
          <OverviewCard />
          <AgendaCard />
          <AICard />

          {/* Profissional */}
          <ProjectsCard />
          <JobsCard />
          <BusinessCard />
          <FinanceCard />

          {/* Pessoal */}
          <HealthCard />
          <StudiesCard />
          <EntertainmentCard />
          <ClosetCard />
          <ConnectionsCard />

          {/* Sistema */}
          <CMSCard />
          <LinksCard />
          <VaultCard />
          <SettingsCard />
        </div>
      </div>
    </section>
  );
}
