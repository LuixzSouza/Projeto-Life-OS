"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { createCard } from "@/app/(dashboard)/flashcards/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CardImageField } from "@/components/flashcards/card-image-field";
import { ArrowRight, Check, Loader2 } from "lucide-react";

/** Botão de envio com estado de carregando (usa o status do <form> pai). */
function SubmitButton({ justAdded }: { justAdded: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant="secondary"
      className="w-full font-semibold shadow-sm transition-colors data-[ok=true]:bg-emerald-500/15 data-[ok=true]:text-emerald-600"
      data-ok={justAdded && !pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adicionando…
        </>
      ) : justAdded ? (
        <>
          <Check className="mr-2 h-4 w-4" /> Adicionado!
        </>
      ) : (
        <>
          Adicionar à pilha <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
        </>
      )}
    </Button>
  );
}

/**
 * Formulário de NOVO cartão com feedback (antes a adição era "seca"): toast de
 * sucesso, limpa o form, devolve o foco ao termo (para enfileirar cartões
 * rápido) e pisca "Adicionado!" no botão. A animação de ENTRADA do cartão fica
 * no FlashcardItem — a reconciliação por key faz só o recém-criado animar.
 */
export function NewCardForm({ deckId }: { deckId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const termRef = useRef<HTMLInputElement>(null);
  const [justAdded, setJustAdded] = useState(false);
  // O ImagePaster guarda a imagem em estado interno — form.reset() não a limpa.
  // Trocar a key remonta o campo zerado (e recolhe) após adicionar o cartão.
  const [imageFieldKey, setImageFieldKey] = useState(0);

  async function handleAdd(formData: FormData) {
    const result = await createCard(deckId, formData);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success("Cartão adicionado à pilha!");
    formRef.current?.reset();
    setImageFieldKey((k) => k + 1); // zera a imagem da frente para o próximo cartão
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
    // Foco de volta no termo: adicionar vários cartões em sequência sem o mouse.
    termRef.current?.focus();
  }

  return (
    <form ref={formRef} action={handleAdd} className="space-y-5">
      <div className="space-y-2">
        <Label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Frente (Pergunta ou imagem)
        </Label>
        <Input
          ref={termRef}
          name="term"
          placeholder="Ex: O que é useState?"
          className="border-border/60 bg-background font-medium focus:ring-primary/20"
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Pode deixar em branco e usar <strong>só uma imagem</strong> abaixo (ex.: identificar uma figura).
        </p>
        <CardImageField key={imageFieldKey} />
      </div>

      <div className="space-y-2">
        <Label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Verso (Resposta)
        </Label>
        <Textarea
          name="definition"
          placeholder="Ex: Um hook do React para gerenciar estado…"
          required
          className="min-h-[120px] resize-none border-border/60 bg-background leading-relaxed focus:ring-primary/20"
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Dica: cole um link do <strong>YouTube, Vimeo ou .mp4</strong> aqui e ele vira um vídeo na revisão.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Dica (opcional)
        </Label>
        <Input
          name="hint"
          placeholder="Ex: começa com 'u' e guarda valor entre renders"
          maxLength={500}
          className="border-border/60 bg-background focus:ring-primary/20"
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Aparece na frente sob demanda (botão <strong>Dica</strong>) — ajuda sem entregar a resposta.
        </p>
      </div>

      <SubmitButton justAdded={justAdded} />
    </form>
  );
}
