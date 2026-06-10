// Streaming REAL do chat da IA (#1 do roadmap): os tokens aparecem conforme
// são gerados pelo provedor, como no Claude/ChatGPT. Transporte SSE sobre um
// route handler; a Server Action (sendMessage) permanece como fallback — o
// client troca sozinho se este endpoint falhar.
//
// Eventos emitidos:
//   status {label}  — passo do loop agêntico ("Consultando seus dados...")
//   delta  {text}   — pedaço do texto final, ao vivo
//   reset  {}       — o texto provisório era preâmbulo de ferramenta, descartar
//   done   {result} — SendMessageResult completo (mensagem persistida + cards)
//   error  {error}  — falha (client cai para a Server Action)

import { getCurrentUserId } from "@/lib/auth";
import { sendMessageCore } from "@/app/(dashboard)/ai/actions/core";
import type { ChatAttachment } from "@/app/(dashboard)/ai/actions/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatStreamBody {
  chatId?: string;
  message?: string;
  attachments?: ChatAttachment[];
}

export async function POST(req: Request): Promise<Response> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  let body: ChatStreamBody;
  try {
    body = (await req.json()) as ChatStreamBody;
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const message = (body.message ?? "").toString();
  if (!message.trim() && !(body.attachments?.length)) {
    return Response.json({ error: "Mensagem vazia." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch { /* stream já fechado (client desistiu) */ }
      };

      try {
        const result = await sendMessageCore(userId, body.chatId, message, body.attachments, (ev) => {
          if (ev.type === "delta") send("delta", { text: ev.text });
          else if (ev.type === "status") send("status", { label: ev.label });
          else if (ev.type === "reset") send("reset", {});
        });
        send("done", result);
      } catch (error: unknown) {
        send("error", { error: error instanceof Error ? error.message : "Falha nos sistemas centrais." });
      } finally {
        try { controller.close(); } catch { /* já fechado */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
