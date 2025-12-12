"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Loader2, Bot, User, Sparkles, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";
import { sendMessage } from "@/app/(dashboard)/ai/actions";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// ❌ REMOVEMOS AS DECLARAÇÕES DUPLICADAS AQUI (linhas 10-21)

// ✅ IMPORTAMOS O TIPO CENTRAL
import { MessageResponse, SendMessageResult } from "@/types/ai"; // Certifique-se do caminho correto

// Tipo local para mensagem (usado no useState)
type Message = MessageResponse;

// Sugestões rápidas baseadas no seu Life OS
const QUICK_PROMPTS = [
// ... (array de prompts)
    { label: "Resumo Financeiro", icon: Wallet, prompt: "Como estão minhas finanças hoje? Tenho gastos recentes?" },
    { label: "O que priorizar?", icon: CheckCircle2, prompt: "Baseado nas minhas tarefas e prazos, o que devo focar agora?" },
    { label: "Análise de Saúde", icon: TrendingUp, prompt: "Analise meu último peso e treino. Estou no caminho certo?" },
    { label: "Planejar o dia", icon: Sparkles, prompt: "Crie um plano para meu dia considerando minha agenda e tarefas." },
];

export function ChatInterface({ 
    initialChatId, 
    initialMessages = [] 
}: { 
    initialChatId?: string, 
    initialMessages?: Message[] 
}) {
    const [messages, setMessages] = useState<Message[]>(initialMessages);
    const [chatId, setChatId] = useState(initialChatId);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        const tempUserMsg: Message = {
            id: Date.now().toString(),
            chatId: chatId || "temp",
            role: "user",
            content: text,
            createdAt: new Date()
        };
        
        setMessages(prev => [...prev, tempUserMsg]);
        setInput("");
        setIsLoading(true);

        try {
            // ✅ CORREÇÃO AQUI: Não precisamos mais do cast forçado, o TS agora entende o tipo.
            const response = await sendMessage(chatId, text); 

            if (response.success && response.message) {
                setMessages(prev => {
                    const newMessages = prev.filter(msg => msg.id !== tempUserMsg.id);
                    return [...newMessages, response.message as Message]; // As Message é apenas um cast de tipo.
                });
                
                if (!chatId && response.chatId) {
                    setChatId(response.chatId);
                    window.history.pushState({}, '', `/ai?id=${response.chatId}`);
                }
            } else {
                // Se a IA falhou, adiciona a mensagem de erro no histórico
                const errorMsg: Message = {
                    id: Date.now().toString() + 'err',
                    chatId: chatId || "temp",
                    role: "assistant",
                    content: response.error || "Erro desconhecido.",
                    createdAt: new Date()
                }
                 setMessages(prev => {
                    const newMessages = prev.filter(msg => msg.id !== tempUserMsg.id); 
                    return [...newMessages, errorMsg];
                });
            }
        } catch (error) {
            toast.error("Erro de conexão com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // ... (restante do código handleKeyDown e do JSX)
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend(input);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            
            {/* --- ÁREA DE MENSAGENS --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-4">
                    
                    {/* Empty State (Boas vindas) */}
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-4 rounded-full">
                                <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">Life OS Intelligence</h3>
                                <p className="text-zinc-500 mt-2 max-w-md mx-auto">
                                    Conectado ao seu financeiro, tarefas e saúde. Como posso ajudar a otimizar sua vida hoje?
                                </p>
                            </div>
                            
                            {/* Grid de Sugestões */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                                {QUICK_PROMPTS.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(item.prompt)}
                                        className="flex items-center gap-3 p-3 text-left text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all group"
                                    >
                                        <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg group-hover:text-indigo-600">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <span className="text-zinc-700 dark:text-zinc-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 font-medium">
                                            {item.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de Mensagens */}
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={cn(
                                "flex gap-4 w-full animate-in fade-in slide-in-from-bottom-2",
                                msg.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                        >
                            {/* Avatar */}
                            <Avatar className={cn("h-8 w-8 border", msg.role === "assistant" ? "bg-indigo-600 border-indigo-600" : "bg-zinc-200 border-zinc-200")}>
                                {msg.role === "assistant" ? (
                                    <AvatarFallback className="bg-indigo-600 text-white"><Bot className="h-4 w-4" /></AvatarFallback>
                                ) : (
                                    <AvatarFallback><User className="h-4 w-4 text-zinc-600" /></AvatarFallback>
                                )}
                            </Avatar>

                            {/* Balão de Texto */}
                            <div className={cn(
                                "flex flex-col max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed",
                                msg.role === "user" 
                                    ? "bg-indigo-600 text-white rounded-tr-none" 
                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-tl-none border border-zinc-200 dark:border-zinc-800"
                            )}>
                                {msg.role === "assistant" ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Loading Indicator */}
                    {isLoading && (
                        <div className="flex gap-4 w-full animate-in fade-in">
                            <Avatar className="h-8 w-8 border bg-indigo-600 border-indigo-600">
                                <AvatarFallback className="bg-indigo-600 text-white"><Bot className="h-4 w-4" /></AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 px-4 py-3 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-800">
                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    )}
                    
                    <div ref={scrollRef} />
                </div>
            </div>

            {/* --- INPUT AREA --- */}
            <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
                <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                    <Textarea 
                        placeholder="Pergunte sobre suas finanças, tarefas ou saúde..." 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className="flex-1 min-h-[44px] max-h-[120px] bg-transparent border-0 focus-visible:ring-0 resize-none py-2.5 text-sm"
                        rows={1}
                    />
                    <Button 
                        size="icon" 
                        onClick={() => handleSend(input)}
                        disabled={isLoading || !input.trim()}
                        className={cn(
                            "h-9 w-9 mb-0.5 transition-all shrink-0",
                            input.trim() ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md" : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800"
                        )}
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
                <p className="text-center text-[10px] text-zinc-400 mt-2">
                    A IA tem acesso aos seus dados do Life OS para fornecer respostas personalizadas.
                </p>
            </div>
        </div>
    );
}