'use client';

import { useState, useCallback } from 'react';
import { Task } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarIcon,
  Flag,
  Trash2,
  Image as ImageIcon,
  X,
  Save,
  Loader2,
  Pin,
  PinOff,
  Calendar,
  Link2,
  Star,
  StarOff,
  Target,
  Timer,
  Eye,
  FileImage,
} from 'lucide-react';
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
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Slider } from '@/components/ui/slider';
import { 
  Sheet, 
  SheetContent, 
  SheetFooter, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Constants
import { PRIORITY_STYLES, STATUS_STYLES } from '../task-item';
import { usePasteFormatter } from '../task-item';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  imageContent: string | null;
  setImageContent: (value: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isPinned: boolean;
  isStarred: boolean;
  progress: number;
  estimatedTime: number;
  isSaving: boolean;
  onTogglePin: () => void;
  onToggleStar: () => void;
  onProgressChange: (value: number) => void;
  setProgress: (value: number) => void;
  setEstimatedTime: (value: number) => void;
  onCopyLink: () => void;
  onDelete: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent) => void;
}

export function EditModal({
  isOpen,
  onClose,
  task,
  imageContent,
  setImageContent,
  fileInputRef,
  isPinned,
  isStarred,
  progress,
  estimatedTime,
  isSaving,
  onTogglePin,
  onToggleStar,
  onProgressChange,
  setProgress,
  setEstimatedTime,
  onCopyLink,
  onDelete,
  onSubmit,
  onImageUpload,
}: EditModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [description, setDescription] = useState(task.description || '');
  
  const { handlePaste: handleDescriptionPaste, isProcessing: isProcessingPaste } = usePasteFormatter((content) => {
    setDescription(content);
  });

  const handleDateSelect = useCallback((date: Date | undefined) => {
    const input = document.querySelector(`[name="dueDate"]`) as HTMLInputElement;
    if (input && date) {
      input.value = format(date, 'yyyy-MM-dd');
    }
  }, []);

  const handleFormSubmit = (formData: FormData) => {
    formData.set('description', description);
    onSubmit(formData);
  };

  const handlePasteInTextarea = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    handleDescriptionPaste(e);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent 
        side="right" 
        className="fixed right-0 top-0 h-full w-full sm:max-w-xl !p-0 flex flex-col border-l shadow-2xl bg-background outline-none !translate-x-0"
        >
        {/* CORREÇÃO DO ERRO: Título acessível (escondido ou visível) */}
        <SheetHeader className="sr-only">
          <SheetTitle>Editar Tarefa: {task.title}</SheetTitle>
          <SheetDescription>Modifique os detalhes, progresso e prazos da sua tarefa.</SheetDescription>
        </SheetHeader>

        <div className="relative shrink-0">
          <div className="relative w-full bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 h-48 flex items-center justify-center overflow-hidden">
            {imageContent ? (
              <>
                <img src={imageContent} alt="Capa" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-4 right-4 h-8 w-8 bg-background/90 backdrop-blur shadow-lg hover:bg-background hover:text-destructive transition-all"
                  onClick={() => setImageContent(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="absolute bottom-4 left-4 right-4">
                  <Input
                    name="title"
                    defaultValue={task.title}
                    required
                    className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-primary rounded-none h-auto text-white placeholder:text-white/70 shadow-none"
                    placeholder="Nome da tarefa..."
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4 text-muted-foreground p-8">
                <div
                  className="p-4 bg-background/50 backdrop-blur rounded-full shadow-lg border border-border cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold">Adicionar imagem de capa</p>
                  <p className="text-xs text-muted-foreground">Arraste uma imagem ou clique para upload</p>
                  <p className="text-xs text-muted-foreground font-mono">Ou cole com Ctrl+V</p>
                </div>
              </div>
            )}
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={onImageUpload}
          />

          <div className="absolute top-4 left-4 flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className={cn(
                      'h-8 w-8 bg-background/90 backdrop-blur shadow-lg transition-all',
                      isPinned ? 'text-amber-600' : 'text-muted-foreground',
                    )}
                    onClick={onTogglePin}
                  >
                    {isPinned ? <Pin className="h-4 w-4" /> : <PinOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>{isPinned ? 'Desfixar' : 'Fixar'}</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className={cn(
                      'h-8 w-8 bg-background/90 backdrop-blur shadow-lg transition-all',
                      isStarred ? 'text-yellow-500' : 'text-muted-foreground',
                    )}
                    onClick={onToggleStar}
                  >
                    {isStarred ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Destaque</p></TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 bg-background/90 backdrop-blur shadow-lg text-muted-foreground"
                    onClick={onCopyLink}
                  >
                    <Link2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Copiar Link</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <div className="border-b px-6 shrink-0">
              <TabsList className="w-full justify-start h-12 bg-transparent">
                <TabsTrigger value="details" className="flex-1 data-[state=active]:bg-primary/10">
                  <Eye className="h-4 w-4 mr-2" /> Detalhes
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex-1 data-[state=active]:bg-primary/10">
                  <Target className="h-4 w-4 mr-2" /> Progresso
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <form action={handleFormSubmit} id={`form-${task.id}`} className="space-y-6">
                <input type="hidden" name="id" value={task.id} />
                
                <TabsContent value="details" className="space-y-6 m-0 outline-none">
                  {!imageContent && (
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        name="title"
                        defaultValue={task.title}
                        required
                        className="text-xl font-bold"
                        placeholder="Nome da tarefa..."
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Descrição</Label>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Markdown Ativo</span>
                    </div>
                    <div className="relative">
                      <Textarea
                        id="description"
                        name="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onPaste={handlePasteInTextarea}
                        className="min-h-[120px] resize-none"
                        placeholder="Descreva a tarefa..."
                      />
                      {isProcessingPaste && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4 p-4 rounded-lg border bg-card">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                        <Flag className="h-4 w-4" /> Configurações
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Prioridade</Label>
                          <Select name="priority" defaultValue={task.priority}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PRIORITY_STYLES).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: value.bgColor }} />
                                    {value.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Status</Label>
                          <Select name="status" defaultValue={task.status || 'TODO'}>
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_STYLES).map(([key, value]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    {value.icon} <span>{value.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 rounded-lg border bg-card">
                      <h3 className="font-semibold text-sm flex items-center gap-2 text-primary">
                        <Calendar className="h-4 w-4" /> Datas
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Vencimento</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-[130px] h-8 text-xs justify-start">
                                <CalendarIcon className="mr-2 h-3 w-3" />
                                {task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yy') : 'Definir'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <CalendarComponent
                                mode="single"
                                selected={task.dueDate ? new Date(task.dueDate) : undefined}
                                onSelect={handleDateSelect}
                                locale={ptBR}
                              />
                            </PopoverContent>
                          </Popover>
                          <input
                            type="hidden"
                            name="dueDate"
                            defaultValue={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-6 m-0 outline-none">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Progresso Atual</Label>
                        <span className="text-2xl font-bold text-primary">{progress}%</span>
                      </div>
                      <Slider
                        value={[progress]}
                        onValueChange={([v]) => { setProgress(v); onProgressChange(v); }}
                        max={100}
                        step={5}
                        className="w-full"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Timer className="h-4 w-4" /> Tempo estimado (minutos)
                      </Label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 30, 60, 120].map((min) => (
                          <Button
                            key={min}
                            type="button"
                            variant={estimatedTime === min ? 'default' : 'outline'}
                            className="h-10 text-xs"
                            onClick={() => {
                              setEstimatedTime(min);
                              const fd = new FormData();
                              fd.set('id', task.id);
                              fd.set('estimatedTime', min.toString());
                              onSubmit(fd);
                            }}
                          >
                            {min}m
                          </Button>
                        ))}
                      </div>
                      <Input
                        type="number"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 0)}
                        onBlur={() => {
                          const fd = new FormData();
                          fd.set('id', task.id);
                          fd.set('estimatedTime', estimatedTime.toString());
                          onSubmit(fd);
                        }}
                      />
                    </div>
                  </div>
                </TabsContent>
              </form>
            </div>
          </Tabs>
        </div>

        <SheetFooter className="p-4 border-t bg-muted/20 flex flex-row justify-between items-center gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription>Essa tarefa sumirá de todos os seus relatórios.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} className="bg-destructive hover:bg-destructive/90">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              form={`form-${task.id}`}
              disabled={isSaving}
              size="sm"
              className="px-8 shadow-md"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}