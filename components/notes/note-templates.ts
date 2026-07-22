// Modelos de nota para estudar (Notion-like, mas prontos e sem página em branco).
// Cada modelo é markdown puro — o editor de notas já renderiza títulos, listas e
// checkboxes. Baseados em métodos consagrados de aprendizado.

export interface NoteTemplate {
  id: string;
  label: string;
  /** Nome do ícone Lucide (resolvido no componente). */
  icon: string;
  description: string;
  title: string;
  content: string;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "cornell",
    label: "Cornell",
    icon: "Columns3",
    description: "Palavras-chave · anotações · resumo — o método clássico de aula.",
    title: "Anotação Cornell",
    content: [
      "## 🔑 Palavras-chave & perguntas",
      "_Colune aqui os termos e as perguntas que a aula responde._",
      "- ",
      "",
      "## 📝 Anotações",
      "_O conteúdo em si, durante a aula/leitura._",
      "- ",
      "",
      "## ✅ Resumo (com suas palavras)",
      "> Em 2–3 frases, o que você levou desta aula?",
      "",
    ].join("\n"),
  },
  {
    id: "feynman",
    label: "Feynman",
    icon: "Baby",
    description: "Explique simples, ache as lacunas e simplifique — aprende de verdade.",
    title: "Técnica Feynman",
    content: [
      "## 1. Explique com suas palavras (como para uma criança)",
      "_Sem jargão. Se travar, é aqui que mora a dúvida._",
      "",
      "",
      "## 2. Onde eu travei?",
      "_Marque os pontos que você não conseguiu explicar._",
      "- ",
      "",
      "## 3. Simplifique + analogia",
      "_Reescreva o difícil com uma comparação do dia a dia._",
      "",
      "",
      "## 4. Teste",
      "- [ ] Consigo explicar sem olhar?",
      "- [ ] A analogia se sustenta?",
      "",
    ].join("\n"),
  },
  {
    id: "resumo",
    label: "Resumo de aula",
    icon: "BookOpen",
    description: "Objetivo, pontos principais, dúvidas e próximos passos.",
    title: "Resumo de aula",
    content: [
      "## 🎯 Objetivo da aula",
      "",
      "",
      "## 📌 Pontos principais",
      "- ",
      "- ",
      "- ",
      "",
      "## ❓ Dúvidas para revisar",
      "- ",
      "",
      "## ➡️ Próximos passos",
      "- [ ] ",
      "",
    ].join("\n"),
  },
  {
    id: "mindmap",
    label: "Mapa mental",
    icon: "Network",
    description: "Um tópico central e ramos — pensa em árvore, não em linha.",
    title: "Mapa mental",
    content: [
      "# 🧠 Tópico central",
      "",
      "- **Ramo 1**",
      "  - subideia",
      "  - subideia",
      "- **Ramo 2**",
      "  - subideia",
      "- **Ramo 3**",
      "  - subideia",
      "",
    ].join("\n"),
  },
  {
    id: "checklist",
    label: "Checklist de estudo",
    icon: "ListChecks",
    description: "Uma lista de tarefas marcável para um plano ou revisão.",
    title: "Checklist de estudo",
    content: [
      "## ✅ Para estudar",
      "- [ ] ",
      "- [ ] ",
      "- [ ] ",
      "",
      "## 🔁 Para revisar",
      "- [ ] ",
      "",
    ].join("\n"),
  },
];
