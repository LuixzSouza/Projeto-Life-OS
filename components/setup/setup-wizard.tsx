"use client";

import { useState } from "react";
import { setupSystem } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    User, ArrowRight, Check, Cpu, Cloud, Moon, Sun, 
    Laptop, Briefcase, CheckCircle2, Terminal, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

// Passos do Wizard
const STEPS = [
    { id: 1, label: "Perfil", icon: User },
    { id: 2, label: "Sistema", icon: Briefcase },
    { id: 3, label: "Inteligência", icon: Cpu },
    { id: 4, label: "Revisão", icon: CheckCircle2 },
];

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    currency: "BRL",
    workStart: "09:00",
    workEnd: "18:00",
    aiProvider: "ollama",
    theme: "system"
  });

  const nextStep = () => setStep((s) => Math.min(s + 1, 4));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));
  const goToStep = (s: number) => {
      if (s < step) setStep(s); // Só permite voltar clicando
  };

  // Cálculo de progresso
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row min-h-[550px] animate-in fade-in zoom-in-95 duration-500">
      
      {/* --- SIDEBAR --- */}
      <div className="w-full md:w-64 bg-zinc-50 dark:bg-zinc-900 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800">
        <div>
            <div className="flex items-center gap-2 mb-8 text-indigo-600 dark:text-indigo-400">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <Terminal className="h-5 w-5" />
                </div>
                <span className="font-bold tracking-tight text-lg">Life OS</span>
            </div>

            <nav className="space-y-1">
                {STEPS.map((s) => (
                    <div 
                        key={s.id}
                        onClick={() => goToStep(s.id)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all select-none",
                            step === s.id 
                                ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700 cursor-default" 
                                : step > s.id 
                                    ? "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer"
                                    : "text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
                        )}
                    >
                        <s.icon className={cn("h-4 w-4", step > s.id && "text-emerald-500")} />
                        {s.label}
                        {step > s.id && <Check className="ml-auto h-3 w-3 text-emerald-500" />}
                    </div>
                ))}
            </nav>
        </div>

        <div className="hidden md:block">
            <div className="flex justify-between text-xs text-zinc-400 mb-2">
                <span>Setup</span>
                <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
        </div>
      </div>

      {/* --- CONTEÚDO DO FORMULÁRIO --- */}
      <div className="flex-1 p-6 md:p-10 flex flex-col">
        <form action={setupSystem} onSubmit={() => setIsLoading(true)} className="flex-1 flex flex-col justify-between">
            
            {/* ⚠️ CORREÇÃO CRÍTICA: INPUTS OCULTOS PARA ENVIAR OS DADOS NO FINAL */}
            <input type="hidden" name="name" value={formData.name} />
            <input type="hidden" name="bio" value={formData.bio} />
            <input type="hidden" name="currency" value={formData.currency} />
            <input type="hidden" name="workStart" value={formData.workStart} />
            <input type="hidden" name="workEnd" value={formData.workEnd} />
            <input type="hidden" name="aiProvider" value={formData.aiProvider} />
            <input type="hidden" name="theme" value={formData.theme} />

            <div className="space-y-6">
                <div className="space-y-1">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {step === 1 && "Olá! Quem é você?"}
                        {step === 2 && "Preferências do Sistema"}
                        {step === 3 && "Cérebro Digital"}
                        {step === 4 && "Tudo pronto?"}
                    </h2>
                    <p className="text-zinc-500 text-sm">
                        {step === 1 && "Vamos personalizar sua experiência inicial."}
                        {step === 2 && "Defina como o Life OS deve operar."}
                        {step === 3 && "Escolha o modelo de IA que vai te ajudar."}
                        {step === 4 && "Revise suas escolhas antes de iniciar."}
                    </p>
                </div>

                <div className="min-h-[260px] pt-4">
                    {/* PASSO 1: PERFIL */}
                    {step === 1 && (
                        <div className="space-y-5 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="grid gap-2">
                                <Label htmlFor="nameInput">Seu Nome</Label>
                                <Input 
                                    id="nameInput"
                                    value={formData.name} // Controlado pelo estado
                                    placeholder="Ex: Luiz Souza" 
                                    className="h-11 bg-zinc-50 dark:bg-zinc-900/50 focus-visible:ring-indigo-500" 
                                    autoFocus
                                    required
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="bioInput">Objetivo Principal (Bio)</Label>
                                <Input 
                                    id="bioInput"
                                    value={formData.bio}
                                    placeholder="Ex: Organizar minha vida financeira e estudos." 
                                    className="h-11 bg-zinc-50 dark:bg-zinc-900/50 focus-visible:ring-indigo-500" 
                                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    {/* PASSO 2: SISTEMA & ROTINA */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-3">
                                    <Label>Moeda Principal</Label>
                                    <div className="flex gap-2">
                                        {['BRL', 'USD', 'EUR'].map(curr => (
                                            <button
                                                key={curr}
                                                type="button"
                                                onClick={() => setFormData({...formData, currency: curr})}
                                                className={cn(
                                                    "flex-1 py-2 text-sm font-medium rounded-lg border transition-all",
                                                    formData.currency === curr 
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                                                        : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                                                )}
                                            >
                                                {curr}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid gap-3">
                                    <Label>Tema</Label>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setFormData({...formData, theme: 'light'})} className={cn("p-2.5 rounded-lg border transition-all flex-1 flex justify-center", formData.theme === 'light' ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}><Sun className="w-4 h-4" /></button>
                                        <button type="button" onClick={() => setFormData({...formData, theme: 'dark'})} className={cn("p-2.5 rounded-lg border transition-all flex-1 flex justify-center", formData.theme === 'dark' ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}><Moon className="w-4 h-4" /></button>
                                        <button type="button" onClick={() => setFormData({...formData, theme: 'system'})} className={cn("p-2.5 rounded-lg border transition-all flex-1 flex justify-center", formData.theme === 'system' ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-400" : "border-zinc-200 dark:border-zinc-800 text-zinc-400")}><Laptop className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3">
                                <Label>Horário de Foco (Para a IA)</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="time" 
                                        value={formData.workStart} 
                                        onChange={(e) => setFormData({...formData, workStart: e.target.value})}
                                        className="bg-zinc-50 dark:bg-zinc-900/50" 
                                    />
                                    <span className="text-zinc-400 text-xs uppercase font-medium">até</span>
                                    <Input 
                                        type="time" 
                                        value={formData.workEnd} 
                                        onChange={(e) => setFormData({...formData, workEnd: e.target.value})}
                                        className="bg-zinc-50 dark:bg-zinc-900/50" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASSO 3: INTELIGÊNCIA */}
                    {step === 3 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div 
                                onClick={() => setFormData({...formData, aiProvider: 'ollama'})}
                                className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
                                    formData.aiProvider === 'ollama' 
                                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 ring-1 ring-indigo-600/20" 
                                        : "border-zinc-100 dark:border-zinc-800"
                                )}
                            >
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700">
                                    <Cpu className="h-6 w-6 text-zinc-700 dark:text-zinc-200" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Local (Ollama)</p>
                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Recomendado</span>
                                    </div>
                                    <p className="text-xs text-zinc-500 mt-0.5">Privacidade máxima. Roda no seu PC.</p>
                                </div>
                                {formData.aiProvider === 'ollama' && <div className="h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
                            </div>

                            <div 
                                onClick={() => setFormData({...formData, aiProvider: 'openai'})}
                                className={cn(
                                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
                                    formData.aiProvider === 'openai' 
                                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/10 ring-1 ring-emerald-600/20" 
                                        : "border-zinc-100 dark:border-zinc-800"
                                )}
                            >
                                <div className="p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-700">
                                    <Cloud className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Nuvem (OpenAI / Groq)</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Mais inteligente e rápido. Requer chaves de API.</p>
                                </div>
                                {formData.aiProvider === 'openai' && <div className="h-5 w-5 bg-emerald-600 rounded-full flex items-center justify-center"><Check className="h-3 w-3 text-white" /></div>}
                            </div>
                        </div>
                    )}

                    {/* PASSO 4: RESUMO */}
                    {step === 4 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
                            <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-inner">
                                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                                    <span className="text-zinc-500 text-sm">Usuário</span>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{formData.name}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                                    <span className="text-zinc-500 text-sm">Cérebro IA</span>
                                    <span className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{formData.aiProvider}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                                    <span className="text-zinc-500 text-sm">Configuração</span>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{formData.currency} • {formData.theme}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-zinc-500 text-sm">Horário Foco</span>
                                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{formData.workStart} - {formData.workEnd}</span>
                                </div>
                            </div>
                            <p className="text-xs text-center text-zinc-400 max-w-xs mx-auto">
                                Tudo pronto. Seus dados são salvos localmente no seu banco SQLite.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* BOTÕES */}
            <div className="flex justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800 mt-auto">
                <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={prevStep} 
                    disabled={step === 1 || isLoading}
                    className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
                >
                    Voltar
                </Button>

                {step < 4 ? (
                    <Button 
                        type="button" 
                        onClick={nextStep} 
                        disabled={step === 1 && !formData.name}
                        className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all"
                    >
                        Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                ) : (
                    <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px] shadow-lg shadow-indigo-600/20 transition-all"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                        {isLoading ? "Criando..." : "Iniciar Sistema"}
                    </Button>
                )}
            </div>
        </form>
      </div>
    </div>
  );
}