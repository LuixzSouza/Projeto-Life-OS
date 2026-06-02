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
};

export type SendMessageResult = {
    success: boolean;
    message?: MessageResponse;
    chatId?: string;
    error?: string;
};