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
  Meeting: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Planning: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  Design: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  Engineering: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Deadline: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  Client: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Other: "border-slate-500/30 bg-slate-500/10 text-slate-300",
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
      className="w-full rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-xl shadow-slate-950/30"
      data-testid="event-details-card"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {event.date}
          </span>
          <h4 className="mt-1 text-xl font-bold text-white leading-tight">{event.title}</h4>
          <span
            className={`mt-2.5 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
          >
            {event.category}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-white/10 bg-slate-900/60 p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          title="Close details"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div className="rounded-2xl border border-white/5 bg-slate-900/50 p-3.5 text-slate-300">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <svg className="h-4 w-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-semibold uppercase tracking-wider text-[11px]">Time Window</span>
          </div>
          <p className="mt-1.5 font-medium text-white">
            {formatTimeShort(`${event.date}T${event.startTime}`)} —{" "}
            {formatTimeShort(`${event.date}T${event.endTime ?? event.startTime}`)}
          </p>
        </div>

        {event.description ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </span>
            <p className="mt-1.5 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        ) : null}

        {event.attendees && event.attendees.length > 0 ? (
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Attendees ({event.attendees.length})
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {event.attendees.map((attendee) => (
                <div
                  key={attendee}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-200"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600/30 text-[10px] font-bold text-violet-300">
                    {attendee.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{attendee}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {canManage && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            {onEdit && (
              <button
                type="button"
                data-testid="event-edit-btn"
                onClick={() => onEdit(event)}
                className="rounded-xl border border-white/10 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                Edit event
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                data-testid="event-delete-btn"
                onClick={() => onDelete(event.id)}
                className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
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
