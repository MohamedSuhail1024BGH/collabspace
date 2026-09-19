"use client";

import type { ReactNode } from "react";

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
      className={`rounded-xl border border-dashed border-outline-variant/25 bg-surface-container-lowest/60 p-8 text-center select-none flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-primary mb-3 border border-outline-variant/20 shadow-xs">
        {icon || (
          <svg className="h-6 w-6 text-on-surface-variant" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>

      <h3 className="text-sm font-semibold text-on-surface font-headline-sm tracking-tight">{title}</h3>
      <p className="mt-1 text-xs font-mono text-on-surface-variant max-w-sm leading-relaxed">{description}</p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-3.5 py-1.5 text-xs font-medium transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
        >
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}

