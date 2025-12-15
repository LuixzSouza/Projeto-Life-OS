import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: string; // Ex: "text-blue-600"
  backUrl?: string;
}

export function PageHeader({ 
  title, 
  description, 
  icon: Icon, 
  iconColor = "text-zinc-900 dark:text-zinc-100", 
  backUrl = "/health" 
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-4">
        <Link href={backUrl}>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Icon className={`h-6 w-6 ${iconColor}`} /> {title}
          </h1>
          <p className="text-zinc-500 text-sm">{description}</p>
        </div>
      </div>
    </div>
  );
}