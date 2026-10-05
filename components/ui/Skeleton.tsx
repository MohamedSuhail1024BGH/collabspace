import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/60", className)}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-surface-container border border-outline-variant/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-12 rounded-full" />
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/15">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? "w-1/3" : i === 1 ? "w-1/4" : "flex-1"}`}
        />
      ))}
    </div>
  );
}

