"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImagePaster } from "@/components/ui/image-paster";

/**
 * Campo de imagem (opcional) para o formulário de NOVO cartão na edição do
 * baralho. O ImagePaster já renderiza um <input name="image"> escondido com o
 * base64, então funciona dentro do <form action={...}> sem JS extra. Fica
 * colapsado para não poluir o formulário rápido de adicionar cartão.
 */
export function CardImageField() {
  const [open, setOpen] = useState(false);
  // Estado só para satisfazer o onImageChange — o valor enviado vem do input
  // escondido interno do ImagePaster.
  const [, setValue] = useState<string | null>(null);

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 text-muted-foreground hover:text-primary"
      >
        <ImagePlus className="h-4 w-4" /> Adicionar imagem à frente
      </Button>
    );
  }

  return <ImagePaster onImageChange={setValue} />;
}
