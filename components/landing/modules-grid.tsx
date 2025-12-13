"use client";

import React from "react";

// Imports
import { OverviewCard } from "./bento/overview-card";
import { AgendaCard } from "./bento/agenda-card";
import { AICard } from "./bento/ai-card";
import { FinanceCard } from "./bento/finance-card";
import { ProjectsCard } from "./bento/projects-card";
import { HealthCard } from "./bento/health-card";
import { StudiesCard } from "./bento/studies-card";
import { ClosetCard } from "./bento/closet-card";
import { EntertainmentCard } from "./bento/entertainment-card";
import { CMSCard } from "./bento/cms-card";
import { LinksCard } from "./bento/links-card";
import { VaultCard } from "./bento/vault-card";
import { ConnectionsCard } from "./bento/connections-card";
import { SettingsCard } from "./bento/settings-card";

export default function ModulesGrid() {
  return (
    <section id="modules" className="relative bg-[#050505] px-4 py-24">
      <div className="mx-auto max-w-7xl">
        
        <div className="mb-12 md:text-center max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-2">Ecossistema Completo</h2>
            <p className="text-zinc-400">Tudo o que você precisa, integrado em um único lugar.</p>
        </div>

        {/* ESTRATÉGIA DO GRID (LG: 4 Colunas):
            R1: [Visão(1)] [Agenda(1)] [   IA (2x2)   ]
            R2: [  Financeiro (2)    ] [..............]
            R3: [ Proj(1) ] [Saúde(1)] [Estudos(1)] [Closet(1)]
            R4: [..(2x2)..] [Entre(1)] [ CMS(1)  ] [Links (1)]
            R5: [Vault(1)] [Conex(1)] [ Configurações (2) ]
        */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[minmax(160px,auto)]">
            
            {/* --- LINHA 1: DASHBOARD DIÁRIO --- */}
            {/* Visão e Agenda lado a lado */}
            <OverviewCard />
            <AgendaCard />
            
            {/* IA ocupando o canto direito (2x2) */}
            <AICard />

            {/* --- LINHA 2: FLUXO DE CAIXA --- */}
            {/* Financeiro ocupa a esquerda, embaixo de Visão/Agenda */}
            <FinanceCard />

            {/* --- LINHA 3 & 4: PRODUTIVIDADE E LAZER MISTURADOS --- */}
            
            {/* Projetos: Alto na esquerda (ocupa linhas 3 e 4 na col 1) */}
            <ProjectsCard /> 

            {/* Linha 3 (Meio): Saúde, Estudos, Closet */}
            <HealthCard />
            <StudiesCard />
            <ClosetCard />

            {/* Linha 4 (Abaixo): Entretenimento e Ferramentas */}
            <EntertainmentCard />
            <CMSCard />
            <LinksCard />

            {/* --- LINHA 5: SISTEMA E SEGURANÇA --- */}
            <VaultCard />
            <ConnectionsCard />
            
            {/* Configurações fecha a base (2 colunas) */}
            <SettingsCard />

        </div>
      </div>
    </section>
  );
}