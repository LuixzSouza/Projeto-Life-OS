import type { MetadataRoute } from "next";

// PWA: torna o Life OS instalável no celular ("Adicionar à tela inicial") —
// abre em janela própria, com ícone e cor de tema, direto no dashboard.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Life OS — Second Brain",
    short_name: "Life OS",
    description: "Seu sistema operacional pessoal: finanças, projetos, estudos, treino e mais.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Captura rápida", url: "/dashboard?capture=1", description: "Anote algo — a IA transforma em tarefa, nota ou evento" },
      { name: "Treinar agora", url: "/health/gym/session", description: "Inicia a sessão de treino ao vivo" },
      { name: "Finanças", url: "/finance", description: "Contas, lançamentos e faturas" },
      { name: "Agenda", url: "/agenda", description: "Calendário unificado" },
    ],
    // Web Share Target: compartilhar link/texto de outro app cai na Inbox Mágica.
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
