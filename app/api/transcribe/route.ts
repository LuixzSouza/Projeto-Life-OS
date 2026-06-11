import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { decryptKey } from "@/lib/settings-crypto";

const norm = (t: string) => t.toLowerCase().replace(/[.,!?;:…]+$/u, "");

// O Whisper "alucina" em trechos silenciosos/ruidosos repetindo a mesma palavra
// ou frase (ex.: "11h30 11h30 11h30..."). Colapsa essas repetições e descarta
// trechos que são puro ruído repetido.
function cleanTranscript(raw: string): string {
  const text = raw.trim();
  if (!text) return "";

  const tokens = text.split(/\s+/);
  // Trecho inteiro = uma só palavra repetida → silêncio/ruído, descarta.
  if (tokens.length >= 3 && new Set(tokens.map(norm)).size === 1) return "";

  // Mantém no máximo 1 repetição imediata da mesma palavra ("ok ok ok" → "ok ok").
  const out: string[] = [];
  for (const tok of tokens) {
    const n = norm(tok);
    const dup =
      out.length >= 2 && norm(out[out.length - 1]) === n && norm(out[out.length - 2]) === n;
    if (!dup) out.push(tok);
  }

  // Colapsa frases curtas repetidas em loop ("bom dia. bom dia. bom dia." → "bom dia.").
  return out
    .join(" ")
    .replace(/(\b[\p{L}\p{N}][^.!?\n]{2,60}?[.!?])(?:\s*\1)+/giu, "$1")
    .trim();
}

// Remove datas/horas isoladas de um prompt para não dar ao Whisper o gatilho
// que ele repete em silêncio.
function sanitizePrompt(p: string): string {
  return p
    .replace(/\b\d{1,2}[:hH]\d{2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Transcreve um áudio de reunião (voz do usuário + áudio do computador)
// usando Whisper via Groq ou OpenAI, conforme a chave configurada.
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ success: false, message: "Não autorizado." }, { status: 401 });

    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob) || audio.size === 0) {
      return NextResponse.json({ success: false, message: "Áudio inválido." }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { userId } });
    const s = settings as unknown as Record<string, string | null | undefined>;
    const groqKey = decryptKey(s?.groqKey);
    const openaiKey = decryptKey(s?.openaiKey);

    if (!groqKey && !openaiKey) {
      return NextResponse.json(
        { success: false, message: "Configure uma chave Groq ou OpenAI em Configurações para transcrever." },
        { status: 400 },
      );
    }

    // Contexto opcional (vocabulário da reunião + cauda do trecho anterior) —
    // é o mecanismo oficial do Whisper p/ acertar nomes próprios e jargões.
    const promptRaw = form.get("prompt");
    const contextPrompt =
      typeof promptRaw === "string" && promptRaw.trim()
        ? sanitizePrompt(promptRaw.trim()).slice(0, 1200)
        : "";

    const callApi = async (url: string, key: string, model: string, withTemperature: boolean) => {
      const apiForm = new FormData();
      apiForm.append("file", audio, "reuniao.webm");
      apiForm.append("model", model);
      apiForm.append("language", "pt");
      apiForm.append("response_format", "json");
      // Modelos gpt-4o-*-transcribe não aceitam temperature como o Whisper.
      if (withTemperature) apiForm.append("temperature", "0");
      if (contextPrompt) apiForm.append("prompt", contextPrompt);
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: apiForm });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok, data: data as { text?: string; error?: { message?: string } } };
    };

    // Groq (whisper-large-v3) é rápido e excelente. No caminho OpenAI, o
    // gpt-4o-mini-transcribe é visivelmente mais preciso que o whisper-1 —
    // com fallback automático se a conta/modelo não aceitar.
    let result: { ok: boolean; data: { text?: string; error?: { message?: string } } };
    if (groqKey) {
      result = await callApi("https://api.groq.com/openai/v1/audio/transcriptions", groqKey, "whisper-large-v3", true);
    } else {
      const oaiUrl = "https://api.openai.com/v1/audio/transcriptions";
      result = await callApi(oaiUrl, openaiKey!, "gpt-4o-mini-transcribe", false);
      if (!result.ok) {
        result = await callApi(oaiUrl, openaiKey!, "whisper-1", true);
      }
    }

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.data?.error?.message || "Falha na transcrição." },
        { status: 502 },
      );
    }

    const transcript = cleanTranscript(result.data.text || "");
    return NextResponse.json({ success: true, transcript });
  } catch (error) {
    console.error("Erro na transcrição:", error);
    return NextResponse.json({ success: false, message: "Erro ao transcrever o áudio." }, { status: 500 });
  }
}
