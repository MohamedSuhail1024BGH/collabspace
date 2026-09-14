"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  events: CalendarEvent[];
  selectedDate?: string | null;
  onSelectEvent: (ev: CalendarEvent) => void;
  onSelectDate: (date: string) => void;
  category?: string;
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

function formatDateHeading(dateStr: string): { label: string; tag?: string } {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowYmd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

  let tag: string | undefined;
  if (dateStr === todayYmd) {
    tag = "Today";
  } else if (dateStr === tomorrowYmd) {
    tag = "Tomorrow";
  }

  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const label = isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-US", options);

  return { label, tag };
}

export default function CalendarAgendaView({
  events,
  selectedDate,
  onSelectEvent,
  onSelectDate,
  category,
}: Props) {
  const filteredEvents = useMemo(() => {
    return events
      .filter((ev) => !category || category === "All" || ev.category === category)
      .sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.startTime.localeCompare(b.startTime);
      });
  }, [events, category]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return Array.from(map.entries());
  }, [filteredEvents]);

  if (groupedByDate.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 mb-3">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h4 className="text-base font-semibold text-white">No scheduled events</h4>
        <p className="mt-1 text-xs text-slate-400 max-w-sm">
          {category && category !== "All"
            ? `There are no scheduled events categorized under "${category}".`
            : "No events are currently scheduled in this workspace. Click \"+ Add event\" to create one."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="calendar-agenda-view">
      {groupedByDate.map(([dateStr, dayEvents]) => {
        const { label, tag } = formatDateHeading(dateStr);
        const isSelected = selectedDate === dateStr;

        return (
          <div
            key={dateStr}
            className={`rounded-2xl border transition-all ${
              isSelected
                ? "border-violet-500/50 bg-slate-900/60 shadow-lg shadow-violet-500/5"
                : "border-white/5 bg-slate-950/40 hover:border-white/10"
            }`}
          >
            <div
              onClick={() => onSelectDate(dateStr)}
              className="flex cursor-pointer items-center justify-between border-b border-white/5 px-4 py-3 bg-white/[0.02]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  {label}
                </span>
                {tag && (
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                    {tag}
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {dayEvents.map((ev) => {
                const badgeStyle = categoryBadgeStyles[ev.category] || categoryBadgeStyles.Other;
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onSelectDate(ev.date);
                      onSelectEvent(ev);
                    }}
                    className="flex cursor-pointer flex-col gap-3 p-4 transition sm:flex-row sm:items-center sm:justify-between hover:bg-white/[0.02]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-[84px] text-xs font-semibold text-violet-300">
                        {formatTimeShort(`${ev.date}T${ev.startTime}`)}
                        {ev.endTime && (
                          <span className="block text-[11px] font-normal text-slate-500">
                            to {formatTimeShort(`${ev.date}T${ev.endTime}`)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-medium text-white hover:text-violet-300 transition">
                            {ev.title}
                          </h5>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeStyle}`}
                          >
                            {ev.category}
                          </span>
                        </div>
                        {ev.description && (
                          <p className="mt-1 text-xs text-slate-400 line-clamp-1">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {ev.attendees && ev.attendees.length > 0 && (
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {ev.attendees.slice(0, 3).map((attendee, idx) => (
                            <span
                              key={idx}
                              title={attendee}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-200 ring-2 ring-slate-900"
                            >
                              {attendee.slice(0, 1).toUpperCase()}
                            </span>
                          ))}
                          {ev.attendees.length > 3 && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[9px] font-medium text-slate-300 ring-2 ring-slate-900">
                              +{ev.attendees.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        className="rounded-xl border border-white/10 bg-slate-900/60 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        Details →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

