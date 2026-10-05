"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { cn } from "@/lib/utils";

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
  Meeting: "border-primary/40 bg-primary/10 text-primary",
  Planning: "border-secondary/40 bg-secondary/15 text-secondary-foreground",
  Design: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Engineering: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Deadline: "border-destructive/40 bg-destructive/10 text-destructive",
  Client: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Other: "border-border/60 bg-muted/40 text-muted-foreground",
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
    <div data-testid="calendar-week-view" className="overflow-x-auto select-none">
      <div className="grid min-w-[540px] sm:min-w-[620px] grid-cols-7 gap-1.5 sm:gap-2">
        {weekDays.map((day) => (
          <div
            key={day.dateStr}
            className={cn(
              "flex min-h-[260px] sm:min-h-[340px] flex-col rounded-lg border transition-all",
              day.isSelected
                ? "border-primary ring-1 ring-primary/40 bg-card shadow-xs"
                : day.inCurrentMonth
                ? "border-border/60 bg-card/60 hover:bg-card hover:border-border"
                : "border-border/30 bg-muted/20 opacity-60"
            )}
          >
            {/* Day Header */}
            <div
              onClick={() => onSelectDate(day.dateStr)}
              className="cursor-pointer border-b border-border/40 p-2.5 text-center transition hover:bg-muted/30"
            >
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {day.dayName}
              </div>
              <div className="mt-1 flex items-center justify-center">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-md text-xs font-mono transition",
                    day.isToday
                      ? "bg-primary font-bold text-primary-foreground shadow-xs"
                      : day.isSelected
                      ? "bg-muted text-primary font-bold ring-1 ring-primary/40"
                      : "text-foreground"
                  )}
                >
                  {day.dayNumber}
                </span>
              </div>
            </div>

            {/* Events in Day */}
            <div className="flex-1 space-y-1.5 p-2 overflow-y-auto max-h-72">
              {day.events.length === 0 ? (
                <div className="pt-8 text-center text-[10px] font-mono text-muted-foreground/40">
                  No events
                </div>
              ) : (
                day.events.map((ev) => {
                  const style =
                    categoryBadgeStyles[ev.category] ||
                    "border-border/50 bg-muted text-foreground";

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={cn(
                        "cursor-pointer rounded-md border p-2 text-left transition hover:brightness-105 shadow-xs",
                        style
                      )}
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
