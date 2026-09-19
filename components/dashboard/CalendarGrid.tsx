"use client";

import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  year: number;
  month: number; // 0-11
  events: CalendarEvent[];
  selectedDate?: string | null; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  onSelectEvent: (ev: CalendarEvent) => void;
  category?: string;
};

const categoryChipStyles: Record<string, string> = {
  Meeting: "border-secondary/30 bg-secondary-container/20 text-secondary hover:brightness-110",
  Planning: "border-primary/30 bg-primary-container/20 text-primary hover:brightness-110",
  Design: "border-primary/30 bg-surface-container-high text-on-surface hover:brightness-110",
  Engineering: "border-tertiary/30 bg-tertiary-container/20 text-tertiary hover:brightness-110",
  Deadline: "border-error/30 bg-error-container/20 text-error hover:brightness-110",
  Client: "border-secondary/30 bg-secondary-container/20 text-secondary hover:brightness-110",
  Other: "border-outline/30 bg-surface-container text-on-surface-variant hover:brightness-110",
};

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dateToYMD(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function CalendarGrid({
  year,
  month,
  events,
  selectedDate,
  onSelectDate,
  onSelectEvent,
  category,
}: Props) {
  const firstDay = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonthDays = firstDay; // number of leading blanks

  const cells: Array<{ date: string; day: number; inMonth: boolean }> = [];

  // previous month's tail
  if (prevMonthDays > 0) {
    const prevMonth = new Date(year, month, 0);
    const prevDays = prevMonth.getDate();
    for (let i = prevDays - prevMonthDays + 1; i <= prevDays; i++) {
      const d = new Date(year, month - 1, i);
      cells.push({
        date: dateToYMD(d.getFullYear(), d.getMonth(), d.getDate()),
        day: i,
        inMonth: false,
      });
    }
  }

  // current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({
      date: dateToYMD(year, month, i),
      day: i,
      inMonth: true,
    });
  }

  // next month's head to fill out trailing grid (42 cells total for 6 rows)
  const total = cells.length;
  const remaining = (7 - (total % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    cells.push({
      date: dateToYMD(d.getFullYear(), d.getMonth(), d.getDate()),
      day: i,
      inMonth: false,
    });
  }

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const todayYmd = dateToYMD(now.getFullYear(), now.getMonth(), now.getDate());

  const filteredEvents = (dateStr: string) => {
    return events.filter(
      (e) => e.date === dateStr && (!category || category === "All" || e.category === category),
    );
  };

  return (
    <div data-testid="calendar-grid-view" className="overflow-x-auto select-none scrollbar-thin">
      <div className="grid grid-cols-7 gap-1.5 border-b border-outline-variant/15 pb-2.5 text-center text-[11px] font-mono uppercase text-on-surface-variant min-w-[580px] font-medium">
        {daysOfWeek.map((d) => (
          <div
            key={d}
            className="py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5 min-w-[580px]">
        {cells.map((cell) => {
          const isToday = cell.date === todayYmd;
          const isSelected = selectedDate === cell.date;
          const evs = filteredEvents(cell.date);

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[100px] cursor-pointer rounded-lg p-2 text-xs transition-all ${
                isSelected
                  ? "border-2 border-primary bg-surface-high shadow-xs"
                  : isToday
                  ? "border-t-2 border-t-primary border-x border-b border-outline-variant/25 bg-surface-lowest hover:bg-surface-high/60"
                  : cell.inMonth
                  ? "border border-outline-variant/15 bg-surface-container-lowest hover:bg-surface-high/60"
                  : "border border-outline-variant/10 bg-surface-container-lowest/30 opacity-40 hover:opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded text-[11px] font-mono transition ${
                    isToday
                      ? "bg-primary font-bold text-on-primary"
                      : isSelected
                      ? "font-bold text-primary"
                      : cell.inMonth
                      ? "font-medium text-on-surface"
                      : "text-on-surface-variant/60"
                  }`}
                >
                  {cell.day}
                </span>
                {evs.length > 0 && (
                  <span className="text-[10px] font-mono text-on-surface-variant">
                    {evs.length}
                  </span>
                )}
              </div>

              <div className="mt-1 space-y-1">
                {evs.slice(0, 2).map((ev) => {
                  const style =
                    categoryChipStyles[ev.category] ||
                    "border-outline/20 bg-surface-container text-on-surface";

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`truncate rounded border px-1.5 py-0.5 text-[10px] font-medium transition cursor-pointer ${style}`}
                      title={`${ev.title} (${formatTimeShort(ev.startTime)})`}
                    >
                      <span className="font-mono text-[9px] opacity-75 mr-1">
                        {formatTimeShort(ev.startTime)}
                      </span>
                      {ev.title}
                    </div>
                  );
                })}

                {evs.length > 2 && (
                  <div className="text-[9px] font-mono text-on-surface-variant px-1">
                    +{evs.length - 2} more
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
