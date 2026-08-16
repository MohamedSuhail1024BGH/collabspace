type SidebarProps = {
  navItems: string[];
};

export function Sidebar({ navItems }: SidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/30 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 text-lg font-semibold text-white">
          C
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workspace</p>
          <h1 className="text-lg font-semibold text-white">CollabSpace</h1>
        </div>
      </div>

      <nav className="space-y-2">
        {navItems.map((item, index) => (
          <button
            key={item}
            type="button"
            className={[
              "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition",
              index === 0
                ? "bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/40"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            ].join(" ")}
          >
            <span>{item}</span>
            {index === 0 ? <span className="text-xs text-violet-200">Live</span> : null}
          </button>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-violet-200">Focus sprint</p>
        <p className="mt-3 text-xl font-semibold text-white">Launch readiness</p>
        <p className="mt-2 text-sm text-slate-300">12 milestones left before the next release.</p>
      </div>
    </aside>
  );
}
