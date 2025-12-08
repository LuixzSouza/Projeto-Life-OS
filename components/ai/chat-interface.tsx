"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { sendMessage } from "@/app/(dashboard)/ai/actions";

export function ChatInterface({ chatId }: { chatId?: string }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    const msg = input;
    setInput(""); // Limpa campo

    try {
        await sendMessage(chatId, msg);
    } finally {
        setIsLoading(false);
        // O Server Action já faz o revalidatePath, então a página vai atualizar com a resposta
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
        <Input 
            placeholder="Digite sua mensagem..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1"
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
    </form>
  );
}