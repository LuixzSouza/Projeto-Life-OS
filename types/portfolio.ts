// src/types/portfolio.ts

export type Proficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface PortfolioData {
  meta: {
    title: string;
    lastUpdated: string;
    completionScore: number;
  };
  hero: {
    name: string;
    headline: string;
    photoUrl?: string; // URL da foto (novo)
    location: string;
    email: string;
    phone: string;
    website: string;
    socials: { linkedin?: string; github?: string; twitter?: string };
    ctaText: string; // Ex: "Contrate-me"
    ctaLink: string; // Ex: mailto:...
  };
  about: {
    short: string; // Resumo de 1-2 frases
    long: string;  // Bio completa
  };
  experience: {
    id: string;
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    location: string;
    summary: string;
    achievements: string[];
    stack: string[];
  }[];
  projects: {
    id: string;
    title: string;
    role: string;
    duration: string;
    problem: string;
    solution: string;
    impact: string;
    stack: string[];
    liveLink?: string;
    repoLink?: string;
    imageUrl?: string; // Screenshot do projeto (novo)
  }[];
  education: {
    id: string;
    institution: string;
    degree: string;
    dates: string;
  }[];
  certifications: { // Nova seção
    id: string;
    name: string;
    issuer: string;
    date: string;
    link?: string;
  }[];
  skills: {
    languages: { name: string; proficiency: Proficiency }[];
    frameworks: { name: string; proficiency: Proficiency }[];
    tools: { name: string; proficiency: Proficiency }[];
    softSkills: string[]; // Nova categoria
  };
  testimonials: { // Nova seção
    id: string;
    authorName: string;
    authorRole: string;
    company: string;
    text: string;
  }[];
}

export const INITIAL_PORTFOLIO: PortfolioData = {
  meta: { title: "Meu Portfólio", lastUpdated: new Date().toISOString(), completionScore: 0 },
  hero: { name: "", headline: "", location: "", email: "", phone: "", website: "", socials: {}, ctaText: "Ver Projetos", ctaLink: "#projects" },
  about: { short: "", long: "" },
  experience: [],
  projects: [],
  education: [],
  certifications: [],
  skills: { languages: [], frameworks: [], tools: [], softSkills: [] },
  testimonials: []
};