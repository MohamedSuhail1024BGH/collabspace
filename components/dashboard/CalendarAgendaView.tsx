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
  Meeting: "border-secondary/30 bg-secondary-container/20 text-secondary",
  Planning: "border-primary/30 bg-primary-container/20 text-primary",
  Design: "border-outline/30 bg-surface-container-high text-on-surface",
  Engineering: "border-tertiary/30 bg-tertiary-container/20 text-tertiary",
  Deadline: "border-error/30 bg-error-container/20 text-error",
  Client: "border-secondary/30 bg-secondary-container/20 text-secondary",
  Other: "border-outline/30 bg-surface-container text-on-surface-variant",
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
      .filter((e) => !category || category === "All" || e.category === category)
      .sort((a, b) => {
        const timeA = `${a.date}T${a.startTime}`;
        const timeB = `${b.date}T${b.startTime}`;
        return timeA.localeCompare(timeB);
      });
  }, [events, category]);

  // Group events by date string
  const groupedByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return Array.from(map.entries()).sort(([dA], [dB]) => dA.localeCompare(dB));
  }, [filteredEvents]);

  if (groupedByDate.length === 0) {
    return (
      <div
        data-testid="calendar-agenda-view"
        className="rounded border border-dashed border-outline/20 bg-surface-container-lowest p-8 text-center"
      >
        <h4 className="text-base font-semibold text-on-surface">No events found</h4>
        <p className="mt-1 text-xs font-mono text-on-surface-variant max-w-sm mx-auto">
          {category && category !== "All"
            ? `There are no scheduled events categorized under "${category}".`
            : "No events are currently scheduled in this workspace. Click \"+ Add event\" to create one."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="calendar-agenda-view">
      {groupedByDate.map(([dateStr, dayEvents]) => {
        const { label, tag } = formatDateHeading(dateStr);
        const isSelected = selectedDate === dateStr;

        return (
          <div
            key={dateStr}
            className={`rounded border transition-all overflow-hidden ${
              isSelected
                ? "border-primary bg-surface-container shadow-xs"
                : "border-outline/20 bg-surface-container-low hover:bg-surface-container"
            }`}
          >
            <div
              onClick={() => onSelectDate(dateStr)}
              className="flex cursor-pointer items-center justify-between border-b border-outline/10 px-3.5 py-2 bg-surface-container-lowest/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-on-surface font-mono">
                  {label}
                </span>
                {tag && (
                  <span className="rounded bg-primary/20 px-2 py-0.2 text-[10px] font-mono text-primary">
                    {tag}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono text-on-surface-variant">
                {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-outline/10">
              {dayEvents.map((ev) => {
                const badgeStyle = categoryBadgeStyles[ev.category] || categoryBadgeStyles.Other;
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onSelectDate(ev.date);
                      onSelectEvent(ev);
                    }}
                    className="flex cursor-pointer flex-col gap-2 p-3 transition sm:flex-row sm:items-center sm:justify-between hover:bg-surface-container-high/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-[80px] text-xs font-mono font-medium text-primary">
                        {formatTimeShort(`${ev.date}T${ev.startTime}`)}
                        {ev.endTime && (
                          <span className="block text-[10px] text-on-surface-variant">
                            to {formatTimeShort(`${ev.date}T${ev.endTime}`)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-on-surface">{ev.title}</p>
                        {ev.description && (
                          <p className="text-[11px] text-on-surface-variant line-clamp-1 mt-0.5">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-mono ${badgeStyle}`}>
                        {ev.category}
                      </span>
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
