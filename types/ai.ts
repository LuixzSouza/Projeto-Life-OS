// types/ai.ts

export type MessageResponse = {
    id: string;
    chatId: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
};

export type SendMessageResult = {
    success: boolean;
    message?: MessageResponse;
    chatId?: string;
    error?: string;
};