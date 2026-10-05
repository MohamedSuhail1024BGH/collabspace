"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border/80 bg-card/40 p-8 text-center select-none flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-muted-foreground mb-3 border border-border/80 shadow-xs">
        {icon || (
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>

      <h3 className="text-sm font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAction}
          className="mt-4 rounded-full text-xs cursor-pointer border-border/80"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
