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
    <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-4 hover:border-primary/40 hover:bg-surface-high transition-all duration-150 group flex flex-col justify-between shadow-xs">
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate font-headline-sm">
            {project.name}
          </p>
          <span className="shrink-0 rounded-md bg-surface-lowest border border-outline-variant/20 px-2 py-0.5 text-[10px] font-mono text-on-surface-variant">
            {project.due}
          </span>
        </div>
        <p className="text-xs text-on-surface-variant font-mono text-[11px]">Lead: <span className="text-on-surface">{project.owner}</span></p>
      </div>

      <div className="mt-4 pt-2.5 border-t border-outline-variant/10">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-mono text-[11px] text-on-surface-variant">Velocity Progress</span>
          <span className={`font-mono text-[11px] font-semibold ${isHighProgress ? "text-tertiary" : "text-secondary"}`}>
            {project.progress}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lowest">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isHighProgress ? "bg-tertiary" : "bg-secondary"}`}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
