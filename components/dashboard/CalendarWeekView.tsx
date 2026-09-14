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
  Meeting: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  Planning: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  Design: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  Engineering: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  Deadline: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  Client: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  Other: "border-slate-500/30 bg-slate-500/10 text-slate-300",
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
      days.push({
        dateStr: ymd,
        dayName: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
        dayNumber: d.getDate(),
        isToday: ymd === todayYmd,
        isSelected: ymd === selectedDate,
        inCurrentMonth: d.getMonth() === month,
      });
    }
    return days;
  }, [refDate, selectedDate, month]);

  const filteredEventsForDate = (dateStr: string) => {
    return events
      .filter(
        (ev) =>
          ev.date === dateStr &&
          (!category || category === "All" || ev.category === category),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <div className="overflow-x-auto" data-testid="calendar-week-view">
      <div className="grid min-w-[700px] grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayEvents = filteredEventsForDate(day.dateStr);

          return (
            <div
              key={day.dateStr}
              className={`flex min-h-[360px] flex-col rounded-2xl border transition-all ${
                day.isSelected
                  ? "border-violet-500 bg-slate-900/70 shadow-lg shadow-violet-500/5"
                  : day.inCurrentMonth
                  ? "border-white/10 bg-slate-950/50 hover:border-white/20"
                  : "border-white/5 bg-slate-950/20 opacity-75"
              }`}
            >
              {/* Day Header */}
              <div
                onClick={() => onSelectDate(day.dateStr)}
                className="cursor-pointer border-b border-white/5 p-3 text-center transition hover:bg-white/[0.02]"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {day.dayName}
                </div>
                <div className="mt-1 flex items-center justify-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition ${
                      day.isToday
                        ? "bg-violet-600 font-bold text-white shadow-md shadow-violet-600/30"
                        : day.isSelected
                        ? "bg-white/10 text-white"
                        : "text-slate-200"
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                </div>
                {dayEvents.length > 0 && (
                  <span className="mt-1 block text-[10px] text-slate-400">
                    {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Day Events */}
              <div className="flex-1 space-y-2 p-2">
                {dayEvents.map((ev) => {
                  const badgeStyle =
                    categoryBadgeStyles[ev.category] || categoryBadgeStyles.Other;
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDate(ev.date);
                        onSelectEvent(ev);
                      }}
                      className="cursor-pointer rounded-xl border border-white/5 bg-slate-900/80 p-2 text-xs transition hover:border-violet-500/40 hover:bg-slate-850"
                    >
                      <div className="font-semibold text-white truncate" title={ev.title}>
                        {ev.title}
                      </div>
                      <div className="mt-0.5 text-[10px] font-medium text-slate-400">
                        {formatTimeShort(`${ev.date}T${ev.startTime}`)}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <span
                          className={`rounded-md border px-1.5 py-0.5 text-[9px] font-semibold ${badgeStyle}`}
                        >
                          {ev.category}
                        </span>
                        {ev.attendees && ev.attendees.length > 0 && (
                          <span className="text-[10px] text-slate-400">
                            👥 {ev.attendees.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {dayEvents.length === 0 && (
                  <div
                    onClick={() => onSelectDate(day.dateStr)}
                    className="flex h-full min-h-[80px] cursor-pointer items-center justify-center rounded-xl p-2 text-center text-[11px] text-slate-600 transition hover:bg-white/[0.01] hover:text-slate-400"
                  >
                    No events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

