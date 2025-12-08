import { prisma } from "@/lib/prisma";
import { sendMessage, clearChat } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Send, Trash2, BrainCircuit } from "lucide-react";
import { ChatInterface } from "@/components/ai/chat-interface"; // Componente cliente que criaremos

export default async function AIPage() {
  // Busca o chat mais recente (Simples, para um usuário só)
  const latestChat = await prisma.aiChat.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BrainCircuit className="text-purple-500" /> Assistente Pessoal
        </h1>
        {latestChat && (
            <form action={clearChat.bind(null, latestChat.id)}>
                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" /> Limpar Conversa</Button>
            </form>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900/50">
        <CardContent className="flex-1 p-0 flex flex-col h-full">
            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {!latestChat || latestChat.messages.length === 0 ? (
                        <div className="text-center text-zinc-400 mt-20">
                            <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Olá, Luiz! Estou conectado aos seus dados.</p>
                            <p className="text-sm">Pergunte sobre suas finanças, treinos ou peça uma dica.</p>
                        </div>
                    ) : (
                        latestChat.messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center shrink-0">
                                        <Bot className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                                    </div>
                                )}
                                <div className={`p-3 rounded-lg max-w-[80%] text-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-white dark:bg-zinc-800 border'
                                }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Input Area (Componente Cliente) */}
            <div className="p-4 bg-background border-t">
                <ChatInterface chatId={latestChat?.id} />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}