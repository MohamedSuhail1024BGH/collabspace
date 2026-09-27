type ProjectCardProps = {
  project: {
    name: string;
    progress: number;
    due: string;
    owner: string;
  };
};

export function ProjectCard({ project }: ProjectCardProps) {
  const isHighProgress = project.progress >= 80;
  return (
    <div className="rounded-lg bg-surface-container-low border border-outline/20 p-3 sm:p-3.5 hover:border-primary/40 hover:bg-surface-container transition-all group flex flex-col justify-between shadow-xs min-w-0 overflow-hidden">
      <div>
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <p className="text-xs sm:text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
            {project.name}
          </p>
          <span className="shrink-0 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant border border-outline-variant/15">
            {project.due}
          </span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-on-surface-variant font-mono">
          Lead: <span className="text-on-surface font-medium">{project.owner}</span>
        </p>
      </div>

      <div className="mt-2.5 pt-2 border-t border-outline/10">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] text-on-surface-variant">Velocity Progress</span>
          <span className={`font-mono text-[10px] font-semibold ${isHighProgress ? "text-tertiary" : "text-secondary"}`}>
            {project.progress}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isHighProgress ? "bg-tertiary" : "bg-secondary"}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
