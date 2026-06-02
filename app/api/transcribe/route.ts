import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { decryptKey } from "@/lib/settings-crypto";

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

    // Groq é mais rápido/barato para Whisper; cai no OpenAI se não houver.
    let url = "";
    let model = "";
    let key = "";
    if (groqKey) {
      url = "https://api.groq.com/openai/v1/audio/transcriptions";
      model = "whisper-large-v3";
      key = groqKey;
    } else if (openaiKey) {
      url = "https://api.openai.com/v1/audio/transcriptions";
      model = "whisper-1";
      key = openaiKey;
    } else {
      return NextResponse.json(
        { success: false, message: "Configure uma chave Groq ou OpenAI em Configurações para transcrever." },
        { status: 400 },
      );
    }

    const apiForm = new FormData();
    apiForm.append("file", audio, "reuniao.webm");
    apiForm.append("model", model);
    apiForm.append("language", "pt");
    apiForm.append("temperature", "0");
    apiForm.append("response_format", "json");

    // Contexto opcional para melhorar a precisão (nomes/jargões da reunião).
    const prompt = form.get("prompt");
    if (typeof prompt === "string" && prompt.trim()) apiForm.append("prompt", prompt.trim().slice(0, 800));

    const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: apiForm });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: data?.error?.message || "Falha na transcrição." },
        { status: 502 },
      );
    }

    const transcript = (data.text as string)?.trim() || "";
    return NextResponse.json({ success: true, transcript });
  } catch (error) {
    console.error("Erro na transcrição:", error);
    return NextResponse.json({ success: false, message: "Erro ao transcrever o áudio." }, { status: 500 });
  }
}
