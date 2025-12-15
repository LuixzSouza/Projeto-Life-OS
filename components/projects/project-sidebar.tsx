import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Folder } from "lucide-react";
import { ProjectItem } from "@/components/projects/project-item";
import { NewProjectDialog } from "./new-project-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Interface simplificada vinda do Prisma
interface ProjectSummary {
    id: string;
    title: string;
    description: string | null;
    color: string | null; // Adicionado cor
    tasks: { id: string; isDone: boolean; }[]; 
}

interface ProjectSidebarProps {
    projects: ProjectSummary[];
    selectedProjectId: string;
}

export function ProjectSidebar({ projects, selectedProjectId }: ProjectSidebarProps) {
    return (
        <aside className="w-full lg:w-72 flex flex-col gap-4 shrink-0 h-full overflow-hidden">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4 h-full flex flex-col">
                <div className="flex items-center justify-between px-2 mb-4 shrink-0">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Projetos</span>
                    <NewProjectDialog />
                </div>

                <div className="flex-1 min-h-0 flex flex-col">
                    <Link href="/projects?id=inbox" className="block mb-2">
                        <Button 
                            variant={selectedProjectId === "inbox" ? "secondary" : "ghost"} 
                            className="w-full justify-start font-medium h-9 text-foreground"
                        >
                            <Folder className="mr-2 h-4 w-4 text-blue-500" /> Inbox
                        </Button>
                    </Link>
                    
                    <Separator className="my-2 bg-border" />
                    
                    <ScrollArea className="flex-1 pr-3">
                        <div className="space-y-1 pb-2">
                            {projects.map((project) => {
                                const pendingCount = project.tasks.filter(task => !task.isDone).length;
                                return (
                                    <ProjectItem 
                                        key={project.id} 
                                        project={project} 
                                        selectedProjectId={selectedProjectId} 
                                        pendingCount={pendingCount} 
                                    />
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </aside>
    );
}