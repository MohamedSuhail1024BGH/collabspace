type ActivityItemProps = {
  item: string;
};

export function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3">
      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-violet-500" aria-hidden="true" />
      <p className="text-sm text-slate-200">{item}</p>
    </div>
  );
}
