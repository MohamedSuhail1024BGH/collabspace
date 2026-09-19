type ActivityItemProps = {
  item: string;
};

export function ActivityItem({ item }: ActivityItemProps) {
  return (
    <div className="flex items-center gap-2.5 rounded bg-surface-container-low border border-outline/20 p-2.5 hover:bg-surface-container transition-all">
      <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden="true" />
      <p className="text-xs text-on-surface truncate">{item}</p>
    </div>
  );
}
