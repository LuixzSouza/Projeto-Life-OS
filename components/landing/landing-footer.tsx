"use client";

import { Github, Twitter, Linkedin, ArrowRight, Heart } from "lucide-react";
import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 pt-16 pb-8">
      <div className="max-w-6xl mx-auto px-6">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-16">
          
          {/* --- COLUNA 1: MARCA & NEWSLETTER (Ocupa 5 colunas) --- */}
          <div className="md:col-span-5 space-y-6">
            <div className="flex items-center gap-2 font-bold text-xl text-white">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.4)]">
                <span className="text-white text-sm font-mono">L</span>
              </div>
              Life OS
            </div>
            
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
              O sistema operacional definitivo para sua vida pessoal e profissional. 
              Organize tarefas, saúde, finanças e conhecimento em um único lugar seguro e local.
            </p>

            {/* Input Newsletter */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fique atualizado</span>
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors w-full max-w-[240px]"
                />
                <button className="bg-white text-black p-2 rounded-lg hover:bg-zinc-200 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* --- COLUNAS DE LINKS (Ocupa 7 colunas restantes) --- */}
          <div className="md:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            
            {/* Grupo 1: Produto */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">Produto</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Funcionalidades</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Integrações</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Changelog</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Download App</Link></li>
              </ul>
            </div>

            {/* Grupo 2: Recursos */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">Recursos</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Documentação</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Comunidade</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Grupo 3: Legal/Sobre */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white">Sobre</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Privacidade</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Termos de Uso</Link></li>
                <li><Link href="#" className="hover:text-indigo-400 transition-colors">Contato</Link></li>
                <li>
                    <a 
                        href="https://github.com/LuixzSouza" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                        <Github className="h-4 w-4" /> Open Source
                    </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* --- RODAPÉ INFERIOR (Bottom Bar) --- */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-zinc-600">
            © 2025 Life OS. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-1 text-xs text-zinc-600">
            Feito com <Heart className="h-3 w-3 text-red-900 fill-red-900" /> por <span className="text-zinc-400 font-bold">Luiz Antônio</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="#" className="text-zinc-600 hover:text-white transition-colors"><Twitter className="h-4 w-4" /></Link>
            <Link href="#" className="text-zinc-600 hover:text-white transition-colors"><Github className="h-4 w-4" /></Link>
            <Link href="#" className="text-zinc-600 hover:text-white transition-colors"><Linkedin className="h-4 w-4" /></Link>
          </div>
        </div>

      </div>
    </footer>
  );
}