// types/projects.ts (OU COLE ESTA INTERFACE NO TOPO DO ProjectsPage.tsx)

export interface ProjectSummary {
    id: string;
    title: string;
    description: string | null;
    // O tipo otimizado do Prisma:
    tasks: { 
        id: string; 
        isDone: boolean 
    }[]; 
}