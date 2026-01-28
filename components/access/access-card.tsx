"use client";

import { useState } from "react";
// Importamos o tipo do Prisma para garantir que o 'item' recebido é válido
import { AccessItem } from "@prisma/client"; 

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Copy, Eye, EyeOff, Pencil, Trash2, Key, ShieldCheck, Hash, 
  Briefcase, ExternalLink, MoreHorizontal, Loader2, Check, 
  User, CalendarClock, LockOpen
} from "lucide-react";
import { toast } from "sonner";
import { deleteAccess, revealPassword } from "@/app/(dashboard)/access/actions";
import { AccessForm, AccessData } from "./access-form";
import { cn } from "@/lib/utils";

/* ---------------------------------- */
/* 1. Definição de Tipos e Configs    */
/* ---------------------------------- */

// Definimos explicitamente quais são as chaves válidas de categoria
type CategoryKey = "FINANCE" | "SOCIAL" | "WORK" | "OTHERS";

// Objeto de configuração tipado
const CATEGORY_CONFIG: Record<CategoryKey, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  FINANCE: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Financeiro" },
  SOCIAL: { icon: Hash, color: "text-blue-500", bg: "bg-blue-500/10", label: "Social" },
  WORK: { icon: Briefcase, color: "text-violet-500", bg: "bg-violet-500/10", label: "Trabalho" },
  OTHERS: { icon: Key, color: "text-orange-500", bg: "bg-orange-500/10", label: "Outros" },
};

/* ---------------------------------- */
/* 2. Funções Auxiliares (Helpers)    */
/* ---------------------------------- */

const getDomain = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
    return domain;
  } catch {
    return null;
  }
};

const calculateStrength = (pass: string | null): number => {
  if (!pass) return 0;
  let score = 0;
  if (pass.length > 8) score += 30;
  if (pass.length > 12) score += 20;
  if (/[A-Z]/.test(pass)) score += 20;
  if (/[0-9]/.test(pass)) score += 15;
  if (/[^A-Za-z0-9]/.test(pass)) score += 15;
  return Math.min(score, 100);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(date));
};

/* ---------------------------------- */
/* 3. Componente Principal            */
/* ---------------------------------- */

export function AccessCard({ item }: { item: AccessItem }) {
  // --- States ---
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // --- Lógica de Categoria Segura ---
  // Verifica se a string do banco é uma chave válida, senão usa OTHERS
  const categoryKey = (Object.keys(CATEGORY_CONFIG).includes(item.category) 
    ? item.category 
    : "OTHERS") as CategoryKey;

  const catConfig = CATEGORY_CONFIG[categoryKey];
  const CategoryIcon = catConfig.icon;

  // --- Favicon ---
  const domain = getDomain(item.url);
  const faviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : undefined;

  // --- Handlers ---

  const handleReveal = async () => {
    if (visible) { setVisible(false); return; }
    if (password) { setVisible(true); return; }

    try {
      setLoading(true);
      const decrypted = await revealPassword(item.id);
      setPassword(decrypted);
      setVisible(true);
    } catch {
      toast.error("Erro ao descriptografar.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string | null, type: 'USER' | 'PASS') => {
    if (!text) {
        toast.info("Campo vazio");
        return;
    }
    navigator.clipboard.writeText(text);
    
    if (type === 'USER') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
    toast.success("Copiado!", { duration: 1500 });
  };

  const handleDelete = async () => {
    await deleteAccess(item.id);
    toast.success("Item removido.");
  };

  // --- Preparação de Dados para o Form (Correção do ANY) ---
  // Criamos um objeto limpo que corresponde exatamente à interface AccessData
  const formData: AccessData = {
    id: item.id,
    title: item.title,
    username: item.username,
    password: item.password, // Passamos a criptografada (o form lida com isso)
    url: item.url,
    category: item.category,
    notes: item.notes,
    client: item.client,
  };

  const strength = calculateStrength(password);
  const strengthColor = strength > 80 ? "bg-emerald-500" : strength > 50 ? "bg-yellow-500" : "bg-red-500";

  return (
    <>
      <Card className="group relative flex flex-col h-full bg-card border-zinc-200 dark:border-zinc-800 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
        
        {/* Faixa decorativa */}
        <div className={cn("absolute top-0 left-0 w-full h-1", catConfig.bg.replace("/10", "/50"))} />

        {/* --- HEADER --- */}
        <div className="p-5 pb-2 flex items-start gap-4">
          <div className="shrink-0 relative">
            <Avatar className="h-12 w-12 rounded-xl border border-border shadow-sm bg-white dark:bg-zinc-900">
              <AvatarImage src={faviconUrl} alt={item.title} className="p-2 object-contain" />
              <AvatarFallback className={cn("rounded-xl", catConfig.bg)}>
                <CategoryIcon className={cn("h-6 w-6", catConfig.color)} />
              </AvatarFallback>
            </Avatar>
            
            {item.client && (
              <div className="absolute -bottom-2 -right-2 bg-background border border-border rounded-full p-0.5 shadow-sm" title={`Cliente: ${item.client}`}>
                 <div className="bg-blue-100 dark:bg-blue-900/50 p-1 rounded-full">
                    <Briefcase className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400" />
                 </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-base text-foreground truncate pr-2" title={item.title}>
                {item.title}
              </h3>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-muted-foreground hover:text-primary">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" /> Editar
                  </DropdownMenuItem>
                  {item.url && (
                    <DropdownMenuItem onClick={() => window.open(item.url?.startsWith("http") ? item.url : `https://${item.url}`, "_blank")}>
                      <ExternalLink className="mr-2 h-4 w-4" /> Acessar Site
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteAlertOpen(true)} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20">
                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-xs text-muted-foreground truncate font-medium">
              {domain || (item.client ? item.client : catConfig.label)}
            </p>
          </div>
        </div>

        {/* --- CONTENT --- */}
        <CardContent className="p-5 pt-2 flex flex-col gap-4 flex-1">
          
          {/* Campo de Usuário */}
          <div className="group/field relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              <User className="h-4 w-4" />
            </div>
            <div className="flex items-center bg-muted/40 border border-border/40 rounded-lg pl-9 pr-9 h-9 transition-colors group-hover/field:border-primary/30 group-hover/field:bg-muted/60">
              <span className="text-sm font-medium truncate select-all text-foreground/80">
                {item.username || "Sem usuário"}
              </span>
            </div>
            {item.username && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:text-primary"
                onClick={() => handleCopy(item.username, 'USER')}
              >
                {copiedUser ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>

          {/* Campo de Senha */}
          <div className="group/pass relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              {visible ? <LockOpen className="h-4 w-4 text-primary/70" /> : <Key className="h-4 w-4" />}
            </div>
            
            <div className={cn(
              "flex items-center justify-between bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-1 h-10 transition-all",
              visible && "ring-1 ring-primary/20 border-primary/30 bg-primary/5"
            )}>
              <div className="flex-1 overflow-hidden mr-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : visible ? (
                  <span className="font-mono text-sm font-medium truncate">{password}</span>
                ) : (
                  <div className="flex gap-1">
                    {[...Array(6)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-600" />)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-background/50" onClick={handleReveal}>
                  {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </Button>
                <div className="w-px h-4 bg-border/60 mx-0.5" />
                <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-background/50 hover:text-emerald-500" onClick={() => handleCopy(password, 'PASS')} disabled={!visible}>
                  {copiedPass ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>

            {visible && password && (
              <div className="absolute -bottom-1 left-0 w-full px-1">
                 <div className="h-0.5 w-full bg-border rounded-full overflow-hidden">
                    <div 
                        className={cn("h-full transition-all duration-500", strengthColor)} 
                        style={{ width: `${strength}%` }} 
                    />
                 </div>
              </div>
            )}
          </div>

        </CardContent>

        {/* --- FOOTER --- */}
        <CardFooter className="px-5 py-3 bg-muted/20 border-t border-border/40 flex justify-between items-center text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5" title="Última atualização">
            <CalendarClock className="h-3 w-3 opacity-70" />
            <span>Atualizado em {formatDate(item.updatedAt || new Date())}</span>
          </div>
          
          {item.notes && (
             <span className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 px-1.5 py-0.5 rounded border border-yellow-500/20" title="Possui notas">
                <span className="block w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                Notas
             </span>
          )}
        </CardFooter>
      </Card>

      {/* --- MODAL EDITAR --- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b bg-muted/10">
            <DialogTitle>Editar Acesso</DialogTitle>
          </DialogHeader>
          <div className="p-6 max-h-[85vh] overflow-y-auto">
            {/* CORREÇÃO CRÍTICA AQUI:
                Não passamos mais 'item' direto. Passamos 'formData' que é do tipo AccessData.
                Isso resolve o erro de tipagem.
            */}
            <AccessForm 
              item={formData} 
              onClose={() => setEditOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DELETAR --- */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir acesso?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sim, excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}