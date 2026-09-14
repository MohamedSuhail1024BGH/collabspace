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
  Meeting: "border-cyan-500/30 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25",
  Planning: "border-blue-500/30 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25",
  Design: "border-violet-500/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25",
  Engineering: "border-amber-500/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25",
  Deadline: "border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25",
  Client: "border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25",
  Other: "border-slate-500/30 bg-slate-500/15 text-slate-200 hover:bg-slate-500/25",
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
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: dateToYMD(year, month, d), day: d, inMonth: true });
  }

  // fill to complete weeks (total cells % 7 === 0)
  while (cells.length % 7 !== 0) {
    const nextDayIndex = cells.length - (prevMonthDays + daysInMonth) + 1;
    const d = new Date(year, month + 1, nextDayIndex);
    cells.push({
      date: dateToYMD(d.getFullYear(), d.getMonth(), d.getDate()),
      day: d.getDate(),
      inMonth: false,
    });
  }

  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const filteredEvents = (dateStr: string) => {
    return events.filter(
      (ev) =>
        ev.date === dateStr &&
        (!category ||
          category === "All" ||
          ev.category === (category as unknown as CalendarEvent["category"])),
    );
  };

  return (
    <div className="overflow-x-auto" data-testid="calendar-grid-view">
      <div className="grid grid-cols-7 gap-1.5 min-w-[620px]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="pb-1 text-center text-xs font-semibold uppercase tracking-wider text-slate-400"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1.5 min-w-[620px]">
        {cells.map((cell) => {
          const isToday = cell.date === todayYmd;
          const isSelected = selectedDate === cell.date;
          const evs = filteredEvents(cell.date);

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[105px] cursor-pointer rounded-2xl p-2 text-sm transition-all ${
                isSelected
                  ? "border-violet-500 bg-slate-900/80 ring-1 ring-violet-500/50 shadow-md shadow-violet-500/10"
                  : cell.inMonth
                  ? "border border-white/5 bg-slate-950/40 hover:border-white/15 hover:bg-slate-900/40"
                  : "border border-white/[0.02] bg-slate-950/15 opacity-45 hover:opacity-80"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition ${
                    isToday
                      ? "bg-violet-600 font-bold text-white shadow-sm shadow-violet-600/40"
                      : isSelected
                      ? "font-bold text-violet-300"
                      : cell.inMonth
                      ? "font-medium text-slate-200"
                      : "text-slate-500"
                  }`}
                >
                  {cell.day}
                </span>
                {evs.length > 0 && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {evs.length}
                  </span>
                )}
              </div>

              <div className="mt-1.5 space-y-1">
                {evs.slice(0, 3).map((ev) => {
                  const chipStyle =
                    categoryChipStyles[ev.category] || categoryChipStyles.Other;
                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={`overflow-hidden rounded-xl border px-1.5 py-1 text-[11px] leading-tight transition ${chipStyle}`}
                      title={`${ev.title} (${ev.startTime}) - ${ev.category}`}
                    >
                      <div className="font-semibold truncate">{ev.title}</div>
                      <div className="text-[10px] opacity-75">
                        {formatTimeShort(`${ev.date}T${ev.startTime}`)}
                      </div>
                    </div>
                  );
                })}
                {evs.length > 3 && (
                  <div className="px-1 text-[10px] font-medium text-slate-400">
                    +{evs.length - 3} more
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
