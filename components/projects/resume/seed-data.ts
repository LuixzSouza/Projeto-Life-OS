import { PortfolioData } from "@/types/portfolio";

// Dados reais extraídos do portifolioLuixz.pdf (CV 2025).
// Usado pelo botão "Importar meu PDF" no Resume Builder — o usuário revisa e salva.
export const LUIZ_PORTFOLIO: PortfolioData = {
  meta: { title: "Currículo — Luiz Antônio de Souza", lastUpdated: new Date().toISOString(), completionScore: 0 },
  hero: {
    name: "Luiz Antônio de Souza",
    headline: "Estudante de Sistemas de Informação · Desenvolvedor Front-End · UI/UX",
    location: "Inconfidentes — MG, Brasil",
    email: "luiz.antoniodesouza004@gmail.com",
    phone: "+55 (35) 9 9735-4797",
    website: "luixzsouza.com.br",
    socials: {
      linkedin: "https://www.linkedin.com/in/luiz-antonio-souza",
      github: "https://github.com/LuixzSouza",
    },
    ctaText: "Disponível para entrevistas",
    ctaLink: "mailto:luiz.antoniodesouza004@gmail.com",
  },
  about: {
    short:
      "Estudante de Sistemas de Informação pela UNIVÁS com mais de dois anos de experiência prática em desenvolvimento web (HTML, CSS, JavaScript, React, Next.js) e suporte administrativo. Busco contribuir com a entrega de produtos digitais bem desenhados, garantindo eficiência, organização e qualidade.",
    long:
      "Estudante de Sistemas de Informação pela UNIVÁS com mais de dois anos de experiência prática em desenvolvimento web (HTML, CSS, JavaScript, React, Next.js) e suporte administrativo. Possuo conhecimentos em Python, C#, Java e MySQL adquiridos na graduação, além de domínio do Pacote Office e ferramentas como Google Drive, Canva e Figma. Atuo de forma proativa e organizada, com facilidade para comunicação, trabalho em equipe e autogestão em ambiente remoto.",
  },
  experience: [
    {
      id: "exp-prefeitura",
      company: "Prefeitura Municipal de Inconfidentes",
      role: "Estagiário de Suporte de TI",
      startDate: "jun 2025",
      endDate: "atual",
      location: "Inconfidentes, MG · presencial",
      summary: "Suporte técnico aos usuários e manutenção da infraestrutura de tecnologia da instituição.",
      achievements: [
        "Suporte técnico aos usuários e resolução de problemas de hardware e software.",
        "Auxílio na manutenção da infraestrutura de tecnologia da instituição.",
        "Contribuição para a segurança e o bom funcionamento dos sistemas.",
        "Desenvolvimento do front-end e back-end do site da prefeitura.",
      ],
      stack: [],
    },
    {
      id: "exp-construsilva",
      company: "Construtora Casa Pronta Construsilva",
      role: "Desenvolvedor Web Front-End",
      startDate: "dez 2024",
      endDate: "dez 2024",
      location: "Joinville, SC · freelancer",
      summary: "Participação no desenvolvimento de site institucional ao lado de uma equipe com designer e mais dois desenvolvedores.",
      achievements: [
        "Implementação de páginas responsivas para web e mobile com foco em performance e experiência fluida.",
        "Construção de sistema funcional de envio de formulários.",
      ],
      stack: ["HTML", "CSS", "JavaScript"],
    },
    {
      id: "exp-formula",
      company: "Fórmula Idiomas",
      role: "Desenvolvedor Web",
      startDate: "nov 2023",
      endDate: "dez 2023",
      location: "Inconfidentes, MG · freelancer",
      summary: "Desenvolvimento de site institucional com páginas segmentadas por faixa etária — adultos, crianças e adolescentes.",
      achievements: [
        "Elaboração de teste de nivelamento de inglês com 60 perguntas e envio automatizado dos resultados ao cliente (nome, e-mail e telefone).",
        "Implementação de redirecionamentos para integrar duas hospedagens diferentes do cliente.",
      ],
      stack: ["React", "Next.js", "JavaScript"],
    },
  ],
  projects: [
    {
      id: "proj-portfolio",
      title: "luixzsouza.com.br",
      role: "Portfólio pessoal",
      duration: "2025",
      problem: "Apresentar projetos e identidade profissional com um sistema de design próprio e consistente.",
      solution: "Portfólio e living style-guide com design system próprio (Roobert + Playfair Display, escala de opacidades, paleta dark-first).",
      impact: "Plataforma viva que centraliza marca pessoal e cases, reforçando a identidade como desenvolvedor front-end e UI/UX.",
      stack: ["Next.js", "React", "TypeScript", "Tailwind"],
      liveLink: "https://luixzsouza.com.br",
      repoLink: "https://github.com/LuixzSouza",
    },
    {
      id: "proj-cubio",
      title: "Cubio — Game Jam 2024",
      role: "Direção visual e identidade",
      duration: "nov — dez 2024",
      problem: "Criar uma identidade visual marcante para um jogo produzido em ambiente de game jam.",
      solution: "Direção de arte e identidade visual do jogo.",
      impact: "Conquistou o Prêmio de Melhor Arte Visual da Cubio Game Jam 2024.",
      stack: ["Figma", "UI/UX"],
    },
  ],
  education: [
    {
      id: "edu-univas",
      institution: "Universidade do Vale do Sapucaí — UNIVÁS",
      degree: "Bacharelado em Sistemas de Informação",
      dates: "jan 2023 — dez 2026 · cursando (5º período)",
    },
  ],
  certifications: [
    { id: "cert-cubio", name: "Prêmio Melhor Arte Visual — Cubio Game Jam 2024", issuer: "Design de Games e Mídia Digital", date: "nov — dez 2024" },
    { id: "cert-aws", name: "AWS Academy Cloud Foundations", issuer: "AWS Academy · Computação em Nuvem", date: "mar — abr 2024" },
    { id: "cert-php", name: "Curso Online de PHP", issuer: "Rocketseat", date: "out 2024" },
    { id: "cert-bradesco", name: "Crie um site com HTML, CSS e JavaScript", issuer: "Fundação Bradesco", date: "out 2024" },
    { id: "cert-codeboost", name: "Curso Front-End", issuer: "CodeBoost", date: "jan 2022 — mai 2023" },
  ],
  skills: {
    languages: [
      { name: "JavaScript", proficiency: "Advanced" },
      { name: "TypeScript", proficiency: "Advanced" },
      { name: "Python", proficiency: "Intermediate" },
      { name: "Java", proficiency: "Intermediate" },
      { name: "C#", proficiency: "Intermediate" },
      { name: "PHP", proficiency: "Intermediate" },
      { name: "SQL / MySQL", proficiency: "Intermediate" },
    ],
    frameworks: [
      { name: "React.js", proficiency: "Advanced" },
      { name: "Next.js", proficiency: "Advanced" },
      { name: "Tailwind", proficiency: "Advanced" },
      { name: "Sass", proficiency: "Intermediate" },
      { name: "Webflow", proficiency: "Intermediate" },
    ],
    tools: [
      { name: "Git", proficiency: "Advanced" },
      { name: "GitHub", proficiency: "Advanced" },
      { name: "Vercel", proficiency: "Advanced" },
      { name: "Netlify", proficiency: "Intermediate" },
      { name: "AWS Cloud Foundations", proficiency: "Intermediate" },
      { name: "Figma", proficiency: "Advanced" },
      { name: "Canva", proficiency: "Advanced" },
      { name: "Pacote Office", proficiency: "Advanced" },
    ],
    softSkills: [
      "Organização",
      "Atenção aos detalhes",
      "Trabalho em equipe",
      "Autogestão remota",
      "Comunicação",
      "Gestão de tempo",
    ],
  },
  testimonials: [],
  languages: [
    { id: "lang-pt", name: "Português", level: "Nativo" },
    { id: "lang-en", name: "Inglês", level: "Intermediário" },
  ],
};
