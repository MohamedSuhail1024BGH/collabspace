import { Skeleton, TableRowSkeleton } from "@/components/ui/Skeleton";

export default function TasksLoading() {
  return (
    <div className="flex flex-col gap-6 pb-12 w-full max-w-full animate-pulse" role="status" aria-label="Loading tasks">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-3.5 w-56" />
        </div>
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>

      <div className="flex gap-2 pb-1 overflow-x-auto">
        <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
        <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
      </div>

      <div className="space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRowSkeleton key={i} columns={4} />
        ))}
      </div>
      <span className="sr-only">Loading tasks...</span>
    </div>
  );
}
