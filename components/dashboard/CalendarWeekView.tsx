"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  year: number;
  month: number;
  events: CalendarEvent[];
  selectedDate?: string | null;
  onSelectDate: (date: string) => void;
  onSelectEvent: (ev: CalendarEvent) => void;
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

export default function CalendarWeekView({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  category,
}: Props) {
  const refDate = useMemo(() => {
    if (selectedDate) {
      const parts = selectedDate.split("-").map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    const today = new Date();
    if (today.getFullYear() === year && today.getMonth() === month) {
      return today;
    }
    return new Date(year, month, 1);
  }, [selectedDate, year, month]);

  const weekDays = useMemo(() => {
    const sunday = new Date(refDate);
    sunday.setDate(refDate.getDate() - refDate.getDay());
    const days = [];
    const today = new Date();
    const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      const dayEvents = events.filter(
        (e) => e.date === ymd && (!category || category === "All" || e.category === category),
      );

      days.push({
        date: d,
        dateStr: ymd,
        dayName: dayNames[i],
        dayNumber: d.getDate(),
        isToday: ymd === todayYmd,
        isSelected: selectedDate === ymd,
        inCurrentMonth: d.getMonth() === month,
        events: dayEvents,
      });
    }

    return days;
  }, [refDate, events, category, selectedDate, month]);

  return (
    <div data-testid="calendar-week-view" className="overflow-x-auto select-none scrollbar-thin">
      <div className="grid min-w-[540px] sm:min-w-[620px] grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className={`flex min-h-[260px] sm:min-h-[340px] flex-col rounded border transition-all ${
              day.isSelected
                ? "border-2 border-primary bg-surface-container-high shadow-xs"
                : day.inCurrentMonth
                ? "border-outline/20 bg-surface-container-lowest hover:bg-surface-container"
                : "border-outline/10 bg-surface-container-lowest/30 opacity-70"
            }`}
          >
            {/* Day Header */}
            <div
              onClick={() => onSelectDate(day.dateStr)}
              className="cursor-pointer border-b border-outline/10 p-2.5 text-center transition"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                {day.dayName}
              </div>
              <div className="mt-1 flex items-center justify-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded text-xs font-mono transition ${
                    day.isToday
                      ? "bg-primary font-bold text-on-primary shadow-xs"
                      : day.isSelected
                      ? "bg-surface-container-highest text-primary font-bold"
                      : "text-on-surface"
                  }`}
                >
                  {day.dayNumber}
                </span>
              </div>
            </div>

            {/* Events in Day */}
            <div className="flex-1 space-y-1.5 p-2 overflow-y-auto max-h-72">
              {day.events.length === 0 ? (
                <div className="pt-8 text-center text-[10px] font-mono text-on-surface-variant/40">
                  No events
                </div>
              ) : (
                day.events.map((ev) => {
                  const style =
                    categoryBadgeStyles[ev.category] ||
                    "border-outline/20 bg-surface-container text-on-surface";

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`cursor-pointer rounded border p-2 text-left transition hover:brightness-110 shadow-xs ${style}`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono opacity-80 mb-0.5">
                        <span>{formatTimeShort(ev.startTime)}</span>
                        {ev.endTime && <span>{formatTimeShort(ev.endTime)}</span>}
                      </div>
                      <p className="font-medium text-xs truncate leading-snug">{ev.title}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
