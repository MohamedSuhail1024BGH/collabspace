import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, User } from "lucide-react";

type ProjectCardProps = {
  project: {
    name: string;
    progress: number;
    due: string;
    owner: string;
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Card className="rounded-2xl border border-border/80 bg-card hover:border-muted-foreground/30 transition-all duration-200">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground truncate">
            {project.name}
          </p>
          <Badge variant="outline" className="text-[10px] font-mono shrink-0 gap-1 rounded-full border-border/80">
            <Calendar className="size-3 text-muted-foreground" />
            <span>{project.due}</span>
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
          <User className="size-3" />
          <span>Lead: <strong className="text-foreground font-medium">{project.owner}</strong></span>
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-1">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Completion</span>
          <span className="text-[11px] font-mono font-bold text-foreground">
            {project.progress}%
          </span>
        </div>
        <Progress value={project.progress} className="h-1.5 rounded-full" />
      </CardContent>
    </Card>
  );
}
