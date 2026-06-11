"use server";

// Checagem de nova versão (DISTRIBUICAO Fase 2): compara a versão local
// (package.json) com um canal remoto. Dois formatos aceitos em
// LIFE_OS_UPDATE_URL:
//   1. latest.json próprio: { "version": "0.2.0", "url": "https://...exe", "notes": "..." }
//   2. GitHub Releases:     https://api.github.com/repos/<dono>/<repo>/releases/latest
// Sem a env configurada, o card explica como ligar (opt-in — nada de rede
// sem o usuário pedir).

import fs from "fs";
import path from "path";
import { requireUserId } from "@/lib/auth";

export interface UpdateCheckResult {
  configured: boolean;
  current: string;
  latest?: string;
  hasUpdate?: boolean;
  downloadUrl?: string;
  notes?: string;
  error?: string;
}

function localVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
    ) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0"; // build instalado sem package.json
  }
}

/** Compara versões "x.y.z" numericamente. >0 = a mais nova que b. */
function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

interface GithubRelease {
  tag_name?: string;
  body?: string;
  html_url?: string;
  assets?: { name?: string; browser_download_url?: string }[];
}

interface LatestJson {
  version?: string;
  url?: string;
  notes?: string;
}

export async function checkForUpdates(): Promise<UpdateCheckResult> {
  await requireUserId();
  const current = localVersion();

  const channel = process.env.LIFE_OS_UPDATE_URL?.trim();
  if (!channel) {
    return { configured: false, current };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(channel, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "life-os-update-check" },
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { configured: true, current, error: `Canal respondeu ${res.status}.` };
    }

    let latest = "";
    let downloadUrl: string | undefined;
    let notes: string | undefined;

    if (/api\.github\.com/.test(channel)) {
      const rel = (await res.json()) as GithubRelease;
      latest = (rel.tag_name ?? "").replace(/^v/, "");
      const exe = rel.assets?.find((a) => a.name?.toLowerCase().endsWith(".exe"));
      downloadUrl = exe?.browser_download_url ?? rel.html_url;
      notes = rel.body?.slice(0, 400);
    } else {
      const json = (await res.json()) as LatestJson;
      latest = (json.version ?? "").replace(/^v/, "");
      downloadUrl = json.url;
      notes = json.notes?.slice(0, 400);
    }

    if (!latest) {
      return { configured: true, current, error: "Canal não informou a versão (latest.json sem 'version')." };
    }

    return {
      configured: true,
      current,
      latest,
      hasUpdate: compareVersions(latest, current) > 0,
      downloadUrl,
      notes,
    };
  } catch (e) {
    const msg = e instanceof Error && e.name === "AbortError" ? "Tempo esgotado." : "Falha de rede.";
    return { configured: true, current, error: msg };
  }
}
