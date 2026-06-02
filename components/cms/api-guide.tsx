"use client";

import { useState } from "react";
import { ManagedSite } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Code2 } from "lucide-react";
import { toast } from "sonner";

export function ApiGuide({ site }: { site: ManagedSite }) {
    const [copied, setCopied] = useState(false);
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

    const copyToClip = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado!");
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <Card className="border-border/40 shadow-xl rounded-[2rem] bg-card overflow-hidden">
                <CardHeader className="bg-muted/10 border-b border-border/40 p-8">
                    <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tighter">
                        <Code2 className="h-5 w-5 text-primary" /> Integração de Rede
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">X-API-KEY (Privada)</Label>
                        <div className="flex gap-2 p-1 bg-muted/20 border border-border/50 rounded-2xl shadow-inner">
                            <Input value={site.apiKey} readOnly className="font-mono text-sm bg-transparent border-none focus-visible:ring-0" />
                            <Button variant="secondary" className="rounded-xl shadow-sm" onClick={() => copyToClip(site.apiKey)}>
                                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Fetch Snippet</Label>
                        <div className="bg-[#1e1e1e] border border-border/20 p-5 rounded-2xl relative group shadow-inner">
                            <pre className="font-mono text-[13px] text-[#9cdcfe] overflow-x-auto">
{`const res = await fetch('${baseUrl}/api/cms/${site.apiKey}/home');
const data = await res.json();`}
                            </pre>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
