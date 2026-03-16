"use client";

import { useState } from "react";
import { AccessItem } from "@prisma/client"; 

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Copy, Eye, EyeOff, Pencil, Trash2, Key, ShieldCheck, Hash, 
  Briefcase, ExternalLink, MoreHorizontal, Loader2, Check, 
  User, CalendarClock, LockOpen, Fingerprint, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { deleteAccess, revealPassword } from "@/app/(dashboard)/access/actions";
import { AccessForm, AccessData } from "./access-form";
import { cn } from "@/lib/utils";

/* ---------------------------------- */
/* 1. Definição de Tipos e Configs    */
/* ---------------------------------- */

type CategoryKey = "FINANCE" | "SOCIAL" | "WORK" | "OTHERS";

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
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // --- Configs de Categoria ---
  const categoryKey = (Object.keys(CATEGORY_CONFIG).includes(item.category) 
    ? item.category 
    : "OTHERS") as CategoryKey;

  const catConfig = CATEGORY_CONFIG[categoryKey];
  const CategoryIcon = catConfig.icon;

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
      toast.error("Decodificação falhou.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string | null, type: 'USER' | 'PASS') => {
    if (!text) return toast.info("Campo vazio");
    
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
    setIsDeleting(true);
    try {
      await deleteAccess(item.id);
      toast.success("Credencial expurgada.");
    } catch {
      toast.error("Erro ao deletar.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formData: AccessData = {
    id: item.id,
    title: item.title,
    username: item.username,
    password: item.password, 
    url: item.url,
    category: item.category,
    notes: item.notes,
    client: item.client,
  };

  const strength = calculateStrength(password);
  const strengthColor = strength > 80 ? "bg-emerald-500" : strength > 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <>
      <Card className="group relative flex flex-col h-full bg-card border-border/40 hover:border-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden rounded-2xl">
        
        {/* Faixa decorativa HUD */}
        <div className={cn("absolute top-0 left-0 w-full h-1.5 transition-colors group-hover:h-2", catConfig.bg.replace("/10", "/50"))} />

        {/* --- HEADER DO CARD --- */}
        <div className="p-6 pb-2 flex items-start gap-4">
          <div className="shrink-0 relative">
            <Avatar className="h-12 w-12 rounded-[1rem] border border-border/40 shadow-sm bg-background">
              <AvatarImage src={faviconUrl} alt={item.title} className="p-2 object-contain" />
              <AvatarFallback className={cn("rounded-[1rem]", catConfig.bg)}>
                <CategoryIcon className={cn("h-5 w-5", catConfig.color)} />
              </AvatarFallback>
            </Avatar>
            
            {item.client && (
              <div className="absolute -bottom-2 -right-2 bg-background border border-border/40 rounded-full p-0.5 shadow-sm" title={`Cliente: ${item.client}`}>
                 <div className="bg-blue-500/10 p-1.5 rounded-full">
                    <Briefcase className="h-3 w-3 text-blue-500" />
                 </div>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <div className="flex justify-between items-start">
              <h3 className="font-black text-sm uppercase tracking-widest text-foreground truncate pr-2" title={item.title}>
                {item.title}
              </h3>
              
              {/* Menu Tático */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 -mr-2 -mt-1 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 shadow-xl">
                  <DropdownMenuItem onClick={() => setEditOpen(true)} className="gap-2 font-bold text-xs uppercase tracking-widest cursor-pointer">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </DropdownMenuItem>
                  {item.url && (
                    <DropdownMenuItem onClick={() => window.open(item.url?.startsWith("http") ? item.url : `https://${item.url}`, "_blank")} className="gap-2 font-bold text-xs uppercase tracking-widest cursor-pointer">
                      <ExternalLink className="h-3.5 w-3.5" /> Acessar
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="bg-border/40" />
                  <DropdownMenuItem onClick={() => setDeleteAlertOpen(true)} className="gap-2 font-bold text-xs uppercase tracking-widest cursor-pointer text-rose-500 focus:text-rose-500 focus:bg-rose-500/10">
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate mt-0.5">
              {domain || (item.client ? item.client : catConfig.label)}
            </p>
          </div>
        </div>

        {/* --- CORPO DO CARD (Inputs) --- */}
        <CardContent className="p-6 flex flex-col gap-4 flex-1">
          
          {/* Identificação (Username) */}
          <div className="group/field relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              <User className="h-4 w-4" />
            </div>
            <div className="flex items-center bg-muted/20 border border-border/40 rounded-xl pl-9 pr-9 h-10 transition-colors group-hover/field:border-primary/30 group-hover/field:bg-muted/40">
              <span className="text-xs font-bold font-mono tracking-tight truncate select-all text-foreground/80">
                {item.username || "SEM_ID"}
              </span>
            </div>
            {item.username && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1 h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={() => handleCopy(item.username, 'USER')}
              >
                {copiedUser ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>

          {/* Chave de Acesso (Password) */}
          <div className="group/pass relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50">
              {visible ? <LockOpen className="h-4 w-4 text-primary" /> : <Key className="h-4 w-4" />}
            </div>
            
            <div className={cn(
              "flex items-center justify-between bg-background border border-border/40 rounded-xl pl-9 pr-1 h-11 transition-all",
              visible && "ring-1 ring-primary/30 border-primary/40 bg-primary/5 shadow-inner"
            )}>
              <div className="flex-1 overflow-hidden mr-2">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : visible ? (
                  <span className="font-mono text-xs font-bold truncate select-all tracking-wider text-foreground">{password}</span>
                ) : (
                  <div className="flex gap-1.5 items-center h-full">
                    {[...Array(8)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/20" />)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-muted/50 text-muted-foreground" onClick={handleReveal}>
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <div className="w-px h-5 bg-border/60 mx-1" />
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 text-muted-foreground" onClick={() => handleCopy(password, 'PASS')} disabled={!visible}>
                  {copiedPass ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Medidor de Força Estilo HUD */}
            {visible && password && (
              <div className="absolute -bottom-1.5 left-2 right-2">
                 <div className="h-1 w-full bg-background border border-border/40 rounded-full overflow-hidden flex">
                    <div 
                        className={cn("h-full transition-all duration-700 ease-out", strengthColor)} 
                        style={{ width: `${strength}%` }} 
                    />
                 </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* --- FOOTER DE METADADOS --- */}
        <CardFooter className="px-6 py-4 bg-muted/10 border-t border-border/40 flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-muted-foreground" title="Última Sincronização">
            <CalendarClock className="h-3 w-3 opacity-60" />
            <span className="text-[9px] font-black uppercase tracking-widest">{formatDate(item.updatedAt || new Date())}</span>
          </div>
          
          {item.notes && (
             <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-md border border-amber-500/20" title="Possui notas">
                <span className="block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[8px] font-black uppercase tracking-widest">Anotado</span>
             </span>
          )}
        </CardFooter>
      </Card>

      {/* --- MODAL EDITAR (USA A NOVA ARQUITETURA HUD) --- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="p-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                <Fingerprint className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle>Sincronizar Acesso</DialogTitle>
                <DialogDescription>Atualize as credenciais no cofre</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="p-6">
            <AccessForm 
              item={formData} 
              onClose={() => setEditOpen(false)} 
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DELETAR (USA A NOVA ARQUITETURA HUD) --- */}
      <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
             <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center rounded-[1.5rem] mb-4 shadow-inner">
                <AlertTriangle className="h-7 w-7"/>
             </div>
            <AlertDialogTitle>Expurgar Credencial?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é irreversível. A chave de acesso será destruída do cofre de forma permanente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Abortar</AlertDialogCancel>
            <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); handleDelete(); }} 
                className="bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20"
                disabled={isDeleting}
            >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar Expurgo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}