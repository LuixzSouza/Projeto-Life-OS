"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPage } from "@/app/(dashboard)/cms/actions";

// Mesma normalização do server action — só para mostrar a rota final ao vivo.
function toSlug(raw: string) {
  return raw.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function NewPageForm({
  siteId,
  onCreated,
}: {
  siteId: string;
  onCreated?: (pageId: string) => void;
}) {
  const [slug, setSlug] = useState("");
  const [pending, startTransition] = useTransition();
  const cleanSlug = toSlug(slug);

  const handleSubmit = (formData: FormData) => {
    if (!cleanSlug) {
      toast.error("Informe um caminho válido para o endpoint.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await createPage(formData);
        toast.success(`Endpoint /${res.slug} criado!`);
        setSlug("");
        onCreated?.(res.id); // o editor pula direto para a nova rota
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Não foi possível criar o endpoint.");
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto py-10">
      <Card className="border-border/40 shadow-sm rounded-2xl bg-card overflow-hidden">
        <CardHeader className="bg-primary/5 border-b border-border/40 p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4 border border-primary/20">
            <Plus className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Novo endpoint</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form action={handleSubmit} className="space-y-6">
            <input type="hidden" name="siteId" value={siteId} />
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground">Caminho do endpoint</Label>
              <div className="flex items-center bg-muted/20 border border-border/50 rounded-xl shadow-inner p-1 focus-within:ring-2 focus-within:ring-primary/20 transition-all h-12">
                <span className="pl-4 pr-2 font-mono text-muted-foreground font-bold text-lg">/</span>
                <Input
                  name="slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ex: v1-posts"
                  className="border-none bg-transparent shadow-none font-mono font-bold text-lg focus-visible:ring-0"
                  required
                />
              </div>
              {slug.trim() && (
                <p className="text-[11px] text-muted-foreground">
                  Rota final:{" "}
                  <code className="font-mono font-semibold text-foreground">/{cleanSlug || "…"}</code>
                </p>
              )}
            </div>
            <Button
              type="submit"
              disabled={pending || !cleanSlug}
              className="w-full h-12 rounded-xl font-semibold shadow-sm gap-2"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {pending ? "Criando…" : "Criar endpoint"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
