"use client";

// Grafo de Conexões (#2 — Segundo Cérebro): visão "mapa mental" das notas.
// Layout force-directed implementado à mão (repulsão + mola + gravidade), sem
// dependência nova: roda a simulação alguns ticks por frame e congela quando
// estabiliza. Clique abre a nota; o slider filtra notas órfãs (grau 0).

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Network, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteGraph, GraphNode } from "@/app/(dashboard)/notes/graph-actions";

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const W = 1200;
const H = 760;

// Posição inicial determinística (espiral) — sem Math.random, layout reproduzível.
function seedPosition(index: number, total: number): { x: number; y: number } {
  const angle = index * 2.39996; // golden angle
  const radius = 40 + 300 * Math.sqrt(index / Math.max(total, 1));
  return { x: W / 2 + radius * Math.cos(angle), y: H / 2 + radius * Math.sin(angle) };
}

export function NoteGraphView({ graph }: { graph: NoteGraph }) {
  const router = useRouter();
  const [hideOrphans, setHideOrphans] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  const visible = useMemo(() => {
    const nodes = hideOrphans ? graph.nodes.filter((n) => n.degree > 0) : graph.nodes;
    const ids = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    return { nodes, edges };
  }, [graph, hideOrphans]);

  // Simulação: ~240 ticks distribuídos em frames; congela ao terminar.
  useEffect(() => {
    const sim: SimNode[] = visible.nodes.map((n, i) => ({
      ...n, ...seedPosition(i, visible.nodes.length), vx: 0, vy: 0,
    }));
    const byId = new Map(sim.map((n) => [n.id, n]));
    const links = visible.edges
      .map((e) => ({ a: byId.get(e.source), b: byId.get(e.target) }))
      .filter((l): l is { a: SimNode; b: SimNode } => Boolean(l.a && l.b));

    let ticks = 0;
    let raf = 0;
    const step = () => {
      for (let k = 0; k < 12 && ticks < 240; k++, ticks++) {
        // Repulsão O(n²) — ok para coleções pessoais de notas.
        for (let i = 0; i < sim.length; i++) {
          for (let j = i + 1; j < sim.length; j++) {
            const a = sim[i], b = sim[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < 1) { dx = (i % 2 ? 1 : -1) * 0.5; dy = (j % 2 ? 1 : -1) * 0.5; d2 = 0.5; }
            const f = 2600 / d2;
            const d = Math.sqrt(d2);
            a.vx += (dx / d) * f; a.vy += (dy / d) * f;
            b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
          }
        }
        // Molas nas arestas.
        for (const { a, b } of links) {
          const dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const f = (d - 110) * 0.015;
          a.vx += (dx / d) * f; a.vy += (dy / d) * f;
          b.vx -= (dx / d) * f; b.vy -= (dy / d) * f;
        }
        // Gravidade ao centro + integração com atrito.
        for (const n of sim) {
          n.vx += (W / 2 - n.x) * 0.004;
          n.vy += (H / 2 - n.y) * 0.004;
          n.vx *= 0.82; n.vy *= 0.82;
          n.x = Math.min(Math.max(n.x + n.vx, 30), W - 30);
          n.y = Math.min(Math.max(n.y + n.vy, 30), H - 30);
        }
      }
      setPositions(new Map(sim.map((n) => [n.id, { x: n.x, y: n.y }])));
      if (ticks < 240) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const neighbors = useMemo(() => {
    if (!hovered) return null;
    const set = new Set<string>([hovered]);
    for (const e of visible.edges) {
      if (e.source === hovered) set.add(e.target);
      if (e.target === hovered) set.add(e.source);
    }
    return set;
  }, [hovered, visible.edges]);

  const orphanCount = graph.nodes.filter((n) => n.degree === 0).length;

  if (graph.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 bg-card/50 py-24 text-center">
        <Network className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-semibold text-foreground">Sem notas ainda</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Crie notas e conecte-as (links no texto ou Conexões) para ver seu segundo cérebro tomar forma aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          <span className="font-bold text-foreground">{visible.nodes.length}</span> notas ·{" "}
          <span className="font-bold text-foreground">{visible.edges.length}</span> conexões
          {hovered && positions.has(hovered) ? " · clique para abrir" : ""}
        </p>
        {orphanCount > 0 && (
          <button
            type="button"
            onClick={() => setHideOrphans((v) => !v)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all",
              hideOrphans
                ? "border-transparent bg-primary/10 text-primary"
                : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60",
            )}
          >
            <Sparkles className="mr-1 inline h-3 w-3" />
            {hideOrphans ? "Mostrando só conectadas" : `Ocultar ${orphanCount} sem conexão`}
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[70vh] w-full" role="img" aria-label="Grafo de conexões entre notas">
          {visible.edges.map((e) => {
            const a = positions.get(e.source);
            const b = positions.get(e.target);
            if (!a || !b) return null;
            const dim = neighbors ? !(neighbors.has(e.source) && neighbors.has(e.target)) : false;
            return (
              <line
                key={`${e.source}-${e.target}`}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={cn("stroke-muted-foreground/30 transition-opacity", dim && "opacity-10")}
                strokeWidth={e.kind === "link" ? 2 : 1}
                strokeDasharray={e.kind === "mention" ? "4 3" : undefined}
              />
            );
          })}
          {visible.nodes.map((n) => {
            const p = positions.get(n.id);
            if (!p) return null;
            const r = 7 + Math.min(n.degree * 2.5, 16);
            const dim = neighbors ? !neighbors.has(n.id) : false;
            return (
              <g
                key={n.id}
                transform={`translate(${p.x}, ${p.y})`}
                className={cn("cursor-pointer transition-opacity", dim && "opacity-15")}
                onMouseEnter={() => setHovered(n.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => router.push(`/notes/${n.id}`)}
              >
                <circle r={r} fill={n.color} fillOpacity={0.22} stroke={n.color} strokeWidth={2} />
                {n.isFavorite && <circle r={2.5} fill={n.color} />}
                <text
                  y={r + 13}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-semibold"
                  style={{ pointerEvents: "none" }}
                >
                  {n.title.length > 26 ? `${n.title.slice(0, 26)}…` : n.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Linha tracejada = menção no texto · linha cheia = conexão explícita (Conexões) · tamanho do nó = nº de ligações · cor = caderno.
      </p>
    </div>
  );
}
