"use client";

import { useState } from "react";
import { ManagedSite, SitePage } from "@prisma/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import {
  savePageContent,
  createPage,
  deletePage,
  deleteSite,
} from "@/app/(dashboard)/cms/actions";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Plus,
  Trash2,
  Save,
  Copy,
  Check,
  Code,
  ExternalLink,
  Sparkles,
  RotateCcw,
} from "lucide-react";

/* ======================================================
   TYPES
====================================================== */

interface SiteWithPages extends ManagedSite {
  pages: SitePage[];
}

/* ======================================================
   COPY BUTTON
====================================================== */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "gap-2 transition-all",
        copied && "border-primary text-primary"
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      API Key
    </Button>
  );
}

/* ======================================================
   JSON EDITOR (SEM useEffect ❌)
====================================================== */

function JsonEditor({ page }: { page: SitePage }) {
  const [json, setJson] = useState<string>(page.content);
  const [dirty, setDirty] = useState(false);
  const [isValid, setIsValid] = useState(true);

  const handleChange = (value: string) => {
    setJson(value);
    setDirty(true);

    try {
      JSON.parse(value);
      setIsValid(true);
    } catch {
      setIsValid(false);
    }
  };

  const handleSave = async () => {
    if (!isValid) {
      toast.error("JSON inválido");
      return;
    }

    const fd = new FormData();
    fd.append("pageId", page.id);
    fd.append("content", json);

    await savePageContent(fd);
    toast.success("Conteúdo salvo");
    setDirty(false);
  };

  const handleReset = () => {
    setJson(page.content);
    setDirty(false);
    setIsValid(true);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono">
            /{page.slug}
          </Badge>

          {!isValid && <Badge variant="destructive">JSON inválido</Badge>}

          {dirty && isValid && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              Alterações pendentes
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          {dirty && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Reverter
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!dirty || !isValid}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      </div>

      {/* EDITOR */}
      <Textarea
        value={json}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        className={cn(
          "flex-1 resize-none font-mono text-sm bg-zinc-950 text-emerald-400 border-zinc-800 p-4",
          !isValid && "border-destructive focus-visible:ring-destructive"
        )}
      />

      {/* FOOTER */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>ID: {page.id}</span>
        <span>
          Atualizado em{" "}
          {new Date(page.updatedAt).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}

/* ======================================================
   SITE MANAGER
====================================================== */

export function SiteManager({ site }: { site: SiteWithPages }) {
  const [activeTab, setActiveTab] = useState<string>(
    site.pages[0]?.id ?? "new"
  );

  const handleDeleteSite = async () => {
    if (!confirm("Deseja remover este site permanentemente?")) return;
    await deleteSite(site.id);
    toast.success("Site removido");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="w-full gap-2">
          <Code className="h-4 w-4" />
          Gerenciar Conteúdo
        </Button>
      </SheetTrigger>

      <SheetContent className="w-[95%] sm:w-[720px] flex flex-col h-full">
        {/* HEADER */}
        <SheetHeader className="border-b pb-4 mb-4">
          <SheetTitle className="flex items-center justify-between">
            <span className="truncate">{site.name}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDeleteSite}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </SheetTitle>

          <SheetDescription className="flex items-center gap-2">
            <span className="truncate">
              {site.url || "Domínio não configurado"}
            </span>
            {site.url && <ExternalLink className="h-3 w-3" />}
          </SheetDescription>

          <div className="mt-3 flex items-center gap-2 rounded-lg border bg-muted p-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <code className="text-xs flex-1 truncate font-mono">
              {site.apiKey}
            </code>
            <CopyButton text={site.apiKey} />
          </div>
        </SheetHeader>

        {/* CONTENT */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <ScrollArea className="border-b mb-4">
            <TabsList className="bg-transparent gap-2">
              {site.pages.map((page) => (
                <TabsTrigger
                  key={page.id}
                  value={page.id}
                  className="border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  /{page.slug}
                </TabsTrigger>
              ))}

              <TabsTrigger
                value="new"
                className="border border-dashed text-muted-foreground gap-1"
              >
                <Plus className="h-3 w-3" />
                Nova rota
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          {/* PAGES */}
          {site.pages.map((page) => (
            <TabsContent
              key={page.id}
              value={page.id}
              className="h-full m-0"
            >
              {/* 🔑 key força remount e elimina o erro */}
              <JsonEditor key={page.id} page={page} />

              <div className="mt-2 text-right">
                <form
                  action={async () => {
                    if (confirm("Remover esta rota?")) {
                      await deletePage(page.id);
                      toast.success("Página removida");
                    }
                  }}
                >
                  <Button
                    variant="link"
                    size="sm"
                    className="text-destructive px-0"
                  >
                    Remover /{page.slug}
                  </Button>
                </form>
              </div>
            </TabsContent>
          ))}

          {/* NEW PAGE */}
          <TabsContent value="new" className="m-0">
            <Card>
              <CardHeader>
                <CardTitle>Criar nova rota</CardTitle>
                <CardDescription>
                  Endpoint JSON disponível via API
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form
                  action={async (fd) => {
                    await createPage(fd);
                    toast.success("Página criada");
                  }}
                  className="space-y-4"
                >
                  <input type="hidden" name="siteId" value={site.id} />

                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <div className="flex">
                      <span className="px-3 py-2 border rounded-l-md bg-muted">
                        /
                      </span>
                      <Input
                        name="slug"
                        required
                        placeholder="minha-rota"
                        className="rounded-l-none"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Criar rota
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
