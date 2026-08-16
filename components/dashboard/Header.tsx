type HeaderProps = {
  title: string;
};

export function Header({ title }: HeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-slate-400">Good morning</p>
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-3 self-start sm:self-auto">
        <div className="hidden rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300 sm:block">
          Search project...
        </div>
        <button
          type="button"
          className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-400"
        >
          New report
        </button>
      </div>
    </header>
  );
}
