import { prisma } from "@/lib/prisma";
import { sendMessage, clearChat } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Trash2, BrainCircuit, Sparkles } from "lucide-react";
import { ChatInterface } from "@/components/ai/chat-interface";
import { Progress } from "@/components/ui/progress"; // Certifique-se que tem esse componente

export default async function AIPage() {
  // Busca o chat mais recente
  const latestChat = await prisma.aiChat.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  // --- CÁLCULO DE MEMÓRIA (Context Window) ---
  // Estimativa: Llama 3 tem ~8k tokens de contexto. Vamos ser conservadores com 4k para garantir performance.
  const CONTEXT_LIMIT = 4096;
  
  // Conta caracteres de todas as mensagens + o System Prompt (estimado em 500 chars)
  const totalChars = latestChat?.messages.reduce((acc, msg) => acc + msg.content.length, 0) || 0;
  const estimatedTokens = Math.ceil((totalChars + 500) / 4); // 1 token ~= 4 chars
  const memoryUsage = Math.min((estimatedTokens / CONTEXT_LIMIT) * 100, 100);
  
  // Define a cor da barra baseada no uso
  let memoryColor = "bg-green-500";
  if (memoryUsage > 50) memoryColor = "bg-yellow-500";
  if (memoryUsage > 80) memoryColor = "bg-red-500";

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
            <BrainCircuit className="text-purple-500" /> Assistente Pessoal
            </h1>
            <p className="text-xs text-zinc-500">Rodando localmente via Ollama</p>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Monitor de Memória */}
            <div className="hidden md:block w-48 space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Memória de Contexto</span>
                    <span>{Math.round(memoryUsage)}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                        className={`h-full ${memoryColor} transition-all duration-500`} 
                        style={{ width: `${memoryUsage}%` }} 
                    />
                </div>
            </div>

            {latestChat && (
                <form action={clearChat.bind(null, latestChat.id)}>
                    <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900">
                        <Trash2 className="mr-2 h-4 w-4" /> Nova Conversa
                    </Button>
                </form>
            )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 shadow-sm">
        <CardContent className="flex-1 p-0 flex flex-col h-full">
            {/* Área de Mensagens */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-6 max-w-3xl mx-auto">
                    {!latestChat || latestChat.messages.length === 0 ? (
                        <div className="text-center text-zinc-400 mt-20 flex flex-col items-center">
                            <div className="h-16 w-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 rotate-3">
                                <Sparkles className="h-8 w-8 text-purple-500" />
                            </div>
                            <h3 className="font-semibold text-lg text-zinc-700 dark:text-zinc-200">Olá, Luiz!</h3>
                            <p className="text-sm max-w-sm">
                                Estou conectado aos seus dados. Posso analisar suas finanças, sugerir treinos ou revisar seus projetos.
                            </p>
                        </div>
                    ) : (
                        latestChat.messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center shrink-0 shadow-sm mt-1">
                                        <Bot className="h-5 w-5 text-white" />
                                    </div>
                                )}
                                <div className={`p-4 rounded-2xl max-w-[85%] text-sm shadow-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-zinc-800 text-white rounded-tr-none dark:bg-zinc-100 dark:text-zinc-900' 
                                    : 'bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-tl-none'
                                }`}>
                                    {/* Renderização simples de quebra de linha */}
                                    {msg.content.split('\n').map((line, i) => (
                                        <p key={i} className="min-h-[1.2em]">{line}</p>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 bg-background border-t">
                <div className="max-w-3xl mx-auto">
                    <ChatInterface chatId={latestChat?.id} />
                    <p className="text-[10px] text-center text-zinc-400 mt-2">
                        A IA tem acesso ao seu saldo, tarefas pendentes e último peso registrado.
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}