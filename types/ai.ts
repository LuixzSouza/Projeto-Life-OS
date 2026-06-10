// types/ai.ts
import type { AIAction } from "@/lib/ai-help";

export type MessageResponse = {
    id: string;
    chatId: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
    // Ações concluídas pela IA neste turno (renderizadas como cards).
    actions?: AIAction[];
    // Sugestões de continuação (chips clicáveis sob a última resposta).
    suggestions?: string[];
    // Imagens anexadas à mensagem (data URLs — renderizadas na bolha).
    images?: string[];
};

export type SendMessageResult = {
    success: boolean;
    message?: MessageResponse;
    chatId?: string;
    error?: string;
    /** true quando uma conversa NOVA foi aberta por troca de IA no meio do papo. */
    switched?: boolean;
};