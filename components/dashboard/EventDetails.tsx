"use client";

import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  canManage?: boolean;
};

const categoryBadgeStyles: Record<string, string> = {
  Meeting: "border-secondary/30 bg-secondary-container/20 text-secondary",
  Planning: "border-primary/30 bg-primary-container/20 text-primary",
  Design: "border-outline/30 bg-surface-container-high text-on-surface",
  Engineering: "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  Deadline: "border-error/30 bg-error-container/20 text-error",
  Client: "border-secondary/30 bg-secondary-container/20 text-secondary",
  Other: "border-outline/30 bg-surface-container text-on-surface-variant",
};

export default function EventDetails({
  event,
  onClose,
  onEdit,
  onDelete,
  canManage = true,
}: Props) {
  if (!event) return null;

  const badgeStyle = categoryBadgeStyles[event.category] || categoryBadgeStyles.Other;

  return (
    <div
      className="w-full rounded border border-outline/20 bg-surface-container-low p-4 text-on-surface shadow-md"
      data-testid="event-details-card"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            {event.date}
          </span>
          <h4 className="mt-0.5 text-base font-bold text-on-surface leading-snug">{event.title}</h4>
          <span
            className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] font-mono ${badgeStyle}`}
          >
            {event.category}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          title="Close details"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 text-xs">
        <div className="rounded border border-outline/20 bg-surface-container-lowest p-3 text-on-surface">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant">
            <svg className="h-3.5 w-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="uppercase tracking-wider">Time Window</span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-on-surface">
            {formatTimeShort(`${event.date}T${event.startTime}`)} —{" "}
            {formatTimeShort(`${event.date}T${event.endTime ?? event.startTime}`)}
          </p>
        </div>

        {event.description ? (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Description
            </span>
            <p className="mt-1 text-xs text-on-surface leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        ) : null}

        {event.attendees && event.attendees.length > 0 ? (
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
              Attendees ({event.attendees.length})
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {event.attendees.map((attendee) => (
                <div
                  key={attendee}
                  className="inline-flex items-center gap-1.5 rounded border border-outline/20 bg-surface-container-lowest px-2 py-0.5 text-xs text-on-surface font-mono"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-on-primary">
                    {attendee.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{attendee}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canManage && (
          <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-outline/10">
            {onEdit && (
              <button
                type="button"
                data-testid="event-edit-btn"
                onClick={() => onEdit(event)}
                className="rounded bg-surface-container hover:bg-surface-container-highest px-3 py-1 text-xs font-mono text-on-surface transition"
              >
                Edit event
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                data-testid="event-delete-btn"
                onClick={() => onDelete(event.id)}
                className="rounded bg-error-container/20 hover:bg-error-container/30 px-3 py-1 text-xs font-mono text-error transition"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
