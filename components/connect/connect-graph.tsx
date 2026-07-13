"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ENTITY_LABEL, entityColor } from "./entity-meta";
import type { LinkRow } from "@/app/(dashboard)/connect/actions";

// Mapa visual das conexões: bolinhas (itens) ligadas por linhas (relações).
// Layout force-directed calculado no cliente, SEM dependência (Fruchterman-
// Reingold simplificado). Determinístico: mesma entrada → mesmo desenho.

interface GNode {
  key: string;
  type: string;
  title: string;
  url: string | null;
  degree: number;
  x: number;
  y: number;
}
interface GEdge { a: string; b: string; }

const WIDTH = 820;
const HEIGHT = 560;
const PAD = 48;

function computeLayout(links: LinkRow[]): { nodes: GNode[]; edges: GEdge[] } {
  const nodeMap = new Map<string, GNode>();
  const edges: GEdge[] = [];

  const ensure = (e: LinkRow["from"]): string | null => {
    if (!e) return null;
    const key = `${e.entityType}:${e.entityId}`;
    if (!nodeMap.has(key)) {
      nodeMap.set(key, { key, type: e.entityType, title: e.title, url: e.actionUrl, degree: 0, x: 0, y: 0 });
    }
    return key;
  };

  for (const l of links) {
    const a = ensure(l.from);
    const b = ensure(l.to);
    if (a && b && a !== b) {
      edges.push({ a, b });
      nodeMap.get(a)!.degree++;
      nodeMap.get(b)!.degree++;
    }
  }

  const nodes = [...nodeMap.values()];
  const n = nodes.length;
  if (n === 0) return { nodes, edges };

  // Posições iniciais num círculo (determinístico).
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const radius = Math.min(WIDTH, HEIGHT) / 2 - PAD;
  nodes.forEach((node, i) => {
    const angle = (i / n) * Math.PI * 2;
    node.x = cx + radius * Math.cos(angle);
    node.y = cy + radius * Math.sin(angle);
  });

  if (n === 1) return { nodes, edges };

  // Simulação: repulsão entre todos + atração pelas arestas + gravidade ao centro.
  const area = WIDTH * HEIGHT;
  const k = Math.sqrt(area / n); // distância ideal
  const iterations = 300;
  let temp = WIDTH / 8;
  const cooling = temp / (iterations + 1);
  const idx = new Map(nodes.map((nd, i) => [nd.key, i]));

  for (let it = 0; it < iterations; it++) {
    const disp = nodes.map(() => ({ x: 0, y: 0 }));

    // Repulsão (O(n²) — ok para dezenas/centenas de nós).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = nodes[i].x - nodes[j].x;
        let dy = nodes[i].y - nodes[j].y;
        let dist = Math.hypot(dx, dy) || 0.01;
        // Desempate determinístico se dois nós coincidirem (evita divisão por ~0).
        if (dist < 0.01) { dx = (i - j) * 0.01; dy = 0.01; dist = Math.hypot(dx, dy); }
        const force = (k * k) / dist;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        disp[i].x += fx; disp[i].y += fy;
        disp[j].x -= fx; disp[j].y -= fy;
      }
    }

    // Atração ao longo das arestas.
    for (const e of edges) {
      const i = idx.get(e.a)!;
      const j = idx.get(e.b)!;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.hypot(dx, dy) || 0.01;
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      disp[i].x -= fx; disp[i].y -= fy;
      disp[j].x += fx; disp[j].y += fy;
    }

    // Gravidade suave ao centro (mantém o grafo coeso).
    for (let i = 0; i < n; i++) {
      disp[i].x += (cx - nodes[i].x) * 0.015;
      disp[i].y += (cy - nodes[i].y) * 0.015;
    }

    // Aplica limitado pela "temperatura" e mantém dentro da caixa.
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      nodes[i].x += (disp[i].x / d) * Math.min(d, temp);
      nodes[i].y += (disp[i].y / d) * Math.min(d, temp);
      nodes[i].x = Math.max(PAD, Math.min(WIDTH - PAD, nodes[i].x));
      nodes[i].y = Math.max(PAD, Math.min(HEIGHT - PAD, nodes[i].y));
    }
    temp -= cooling;
  }

  return { nodes, edges };
}

function nodeRadius(degree: number): number {
  return Math.min(22, 8 + degree * 2);
}

export function ConnectGraph({ links }: { links: LinkRow[] }) {
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => computeLayout(links), [links]);

  // Vizinhos do nó em foco (para destacar).
  const neighbors = useMemo(() => {
    if (!hover) return null;
    const set = new Set<string>([hover]);
    for (const e of edges) {
      if (e.a === hover) set.add(e.b);
      if (e.b === hover) set.add(e.a);
    }
    return set;
  }, [hover, edges]);

  const modules = useMemo(() => {
    const seen = new Map<string, number>();
    for (const node of nodes) seen.set(node.type, (seen.get(node.type) ?? 0) + 1);
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [nodes]);

  const posOf = useMemo(() => new Map(nodes.map((n) => [n.key, n])), [nodes]);

  if (nodes.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Legenda dos módulos presentes */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {modules.map(([type, count]) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entityColor(type) }} />
            {ENTITY_LABEL[type] ?? type}
            <span className="text-muted-foreground/50">{count}</span>
          </span>
        ))}
      </div>

      <div className="overflow-auto rounded-xl border border-border/50 bg-card">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-[560px] w-full min-w-[680px]"
          role="img"
          aria-label="Mapa de conexões entre itens"
        >
          {/* Arestas */}
          {edges.map((e, i) => {
            const a = posOf.get(e.a);
            const b = posOf.get(e.b);
            if (!a || !b) return null;
            const active = !neighbors || (neighbors.has(e.a) && neighbors.has(e.b));
            return (
              <line
                key={i}
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={active ? "stroke-muted-foreground/40" : "stroke-muted-foreground/10"}
                strokeWidth={active ? 1.5 : 1}
              />
            );
          })}

          {/* Nós */}
          {nodes.map((node) => {
            const r = nodeRadius(node.degree);
            const dim = neighbors ? !neighbors.has(node.key) : false;
            const color = entityColor(node.type);
            return (
              <g
                key={node.key}
                transform={`translate(${node.x}, ${node.y})`}
                className={node.url ? "cursor-pointer" : "cursor-default"}
                opacity={dim ? 0.25 : 1}
                onMouseEnter={() => setHover(node.key)}
                onMouseLeave={() => setHover((h) => (h === node.key ? null : h))}
                onClick={() => node.url && router.push(node.url)}
              >
                <circle r={r + 3} fill="var(--background)" />
                <circle r={r} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} />
                <text
                  y={r + 13}
                  textAnchor="middle"
                  className="pointer-events-none fill-foreground text-[11px] font-medium"
                >
                  {node.title.length > 22 ? `${node.title.slice(0, 21)}…` : node.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Passe o mouse para destacar as ligações de um item; clique para abri-lo. Itens mais conectados aparecem maiores.
      </p>
    </div>
  );
}
