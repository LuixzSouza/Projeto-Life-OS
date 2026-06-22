"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code2, KeyRound, Link2, Terminal, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import type { SiteWithPages } from "./site-editor-types";

function FieldLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {children}
    </p>
  );
}

export function ApiGuide({ site }: { site: SiteWithPages }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const slugs = site.pages.map((p) => p.slug);
  const [slug, setSlug] = useState(slugs.includes("home") ? "home" : slugs[0] ?? "home");

  const endpoint = `${baseUrl}/api/cms/${site.apiKey}/${slug}`;
  const fetchSnippet = `const res = await fetch("${endpoint}");\nconst data = await res.json();`;
  const curlSnippet = `curl ${endpoint}`;

  return (
    <div className="w-full max-w-3xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm">
        <CardHeader className="border-b border-border/40 bg-muted/10 p-8">
          <CardTitle className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Code2 className="h-5 w-5 text-primary" /> Integração
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Consuma qualquer endpoint deste container com um GET público — sem SDK, sem auth.
          </p>
        </CardHeader>

        <CardContent className="space-y-8 p-8">
          {/* Chave do projeto */}
          <div className="space-y-2">
            <FieldLabel icon={KeyRound}>Chave do projeto</FieldLabel>
            <p className="text-[11px] leading-relaxed text-muted-foreground/70">
              Vai na própria URL — quem tiver a chave lê os endpoints. Trate como semi-pública.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-1 pl-4 shadow-inner">
              <code className="flex-1 truncate font-mono text-sm text-foreground/80">{site.apiKey}</code>
              <CopyButton text={site.apiKey} label="Copiar" />
            </div>
          </div>

          {/* Seletor de endpoint */}
          {slugs.length > 0 ? (
            <div className="space-y-2">
              <FieldLabel icon={FileJson}>Endpoint</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {site.pages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSlug(p.slug)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold transition-colors",
                      p.slug === slug
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    /{p.slug}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border/60 bg-muted/10 p-4 text-center text-xs text-muted-foreground">
              Crie um endpoint para gerar os exemplos de integração.
            </p>
          )}

          {/* URL do endpoint */}
          <div className="space-y-2">
            <FieldLabel icon={Link2}>URL do endpoint (GET)</FieldLabel>
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 p-1 pl-4 shadow-inner">
              <code className="flex-1 truncate font-mono text-xs text-foreground/80">{endpoint}</code>
              <CopyButton text={endpoint} label="Copiar" />
            </div>
          </div>

          {/* Fetch */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel icon={Terminal}>Fetch (JavaScript)</FieldLabel>
              <CopyButton text={fetchSnippet} label="Copiar" />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border/20 bg-[#1e1e1e] p-5 shadow-inner">
              <pre className="font-mono text-[13px] text-[#9cdcfe]">{fetchSnippet}</pre>
            </div>
          </div>

          {/* cURL */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <FieldLabel icon={Terminal}>cURL</FieldLabel>
              <CopyButton text={curlSnippet} label="Copiar" />
            </div>
            <div className="overflow-x-auto rounded-2xl border border-border/20 bg-[#1e1e1e] p-5 shadow-inner">
              <pre className="font-mono text-[13px] text-emerald-300">{curlSnippet}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
