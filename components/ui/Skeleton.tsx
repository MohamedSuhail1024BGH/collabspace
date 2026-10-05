import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted/80", className)}
      {...props}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/80 p-5 space-y-3 shadow-xs">
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
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card/60 border border-border/60">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === 0 ? "w-1/3" : i === 1 ? "w-1/4" : "flex-1"}`}
        />
      ))}
    </div>
  );
}
