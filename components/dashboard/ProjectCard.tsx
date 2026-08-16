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
    <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-medium text-white">{project.name}</p>
          <p className="mt-1 text-sm text-slate-400">Owner: {project.owner}</p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
          {project.due}
        </span>
      </div>

      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
        <span>Progress</span>
        <span>{project.progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          style={{ width: `${project.progress}%` }}
        />
      </div>
    </div>
  );
}
