"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Plus, FileJson, Settings, Code2, Database, AlertCircle } from "lucide-react";

import type { SiteWithPages } from "./site-editor-types";
import { CodeEditor } from "./code-editor";
import { ApiGuide } from "./api-guide";
import { NewPageForm } from "./new-page-form";
import { SiteDangerZone } from "./site-danger-zone";

export function SiteEditor({ site }: { site: SiteWithPages }) {
    const [activeTab, setActiveTab] = useState(site.pages.length > 0 ? site.pages[0].id : "new-page");

    return (
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
            {/* SIDEBAR DO EDITOR */}
            <aside className="w-full md:w-64 lg:w-72 border-b md:border-b-0 md:border-r border-border/40 bg-muted/5 flex flex-col shrink-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="flex flex-col h-full">
                    <div className="p-5 border-b border-border/40 bg-background/50">
                        <Button onClick={() => setActiveTab("new-page")} className="w-full gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-md h-10">
                            <Plus className="h-4 w-4" /> Novo Endpoint
                        </Button>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">

                            {/* ROTAS */}
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <Database className="h-3 w-3" /> Rotas Ativas
                                </div>
                                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                                    {site.pages.map(page => (
                                        <TabsTrigger
                                            key={page.id} value={page.id}
                                            className="w-full justify-start px-3 py-2.5 h-auto text-xs font-semibold rounded-xl text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary border border-transparent data-[state=active]:border-primary/20 transition-all"
                                        >
                                            <FileJson className="mr-2 h-4 w-4 opacity-70" />
                                            <span className="truncate">/{page.slug}</span>
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </div>

                            <Separator className="bg-border/40" />

                            {/* SISTEMA */}
                            <div className="space-y-2">
                                <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                    <Settings className="h-3 w-3" /> Sistema
                                </div>
                                <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
                                    <TabsTrigger value="api" className="w-full justify-start px-3 py-2.5 rounded-xl text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background transition-all">
                                        <Code2 className="mr-2 h-4 w-4 opacity-70" /> Integração
                                    </TabsTrigger>
                                    <TabsTrigger value="settings" className="w-full justify-start px-3 py-2.5 rounded-xl text-muted-foreground hover:text-red-600 data-[state=active]:bg-red-500 data-[state=active]:text-white transition-all">
                                        <AlertCircle className="mr-2 h-4 w-4 opacity-70" /> Danger Zone
                                    </TabsTrigger>
                                </TabsList>
                            </div>

                        </div>
                    </ScrollArea>
                </Tabs>
            </aside>

            {/* PAINEL PRINCIPAL DO EDITOR */}
            <main className="flex-1 bg-background/50 p-4 md:p-6 overflow-hidden flex flex-col relative min-h-[500px]">
                <Tabs value={activeTab} className="h-full flex flex-col relative w-full">

                    {/* Renderiza o CodeEditor para cada página */}
                    {site.pages.map(page => (
                        <TabsContent key={page.id} value={page.id} className="h-full mt-0 focus-visible:ring-0">
                            <CodeEditor page={page} />
                        </TabsContent>
                    ))}

                    {/* ABA: CRIAR NOVA ROTA */}
                    <TabsContent value="new-page" className="h-full mt-0 overflow-y-auto">
                        <NewPageForm siteId={site.id} />
                    </TabsContent>

                    {/* ABA: API */}
                    <TabsContent value="api" className="h-full mt-0 overflow-y-auto focus-visible:ring-0">
                        <div className="py-10 flex justify-center">
                            <ApiGuide site={site} />
                        </div>
                    </TabsContent>

                    {/* 🟢 ABA: SETTINGS / DANGER ZONE */}
                    <TabsContent value="settings" className="h-full mt-0 overflow-y-auto focus-visible:ring-0">
                        <SiteDangerZone site={site} />
                    </TabsContent>

                </Tabs>
            </main>
        </div>
    );
}
