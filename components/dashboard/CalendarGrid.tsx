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

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function dateToYMD(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

export default function CalendarGrid({ year, month, events, selectedDate, onSelectDate, onSelectEvent, category }: Props) {
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
      cells.push({ date: dateToYMD(d.getFullYear(), d.getMonth(), d.getDate()), day: i, inMonth: false });
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
    cells.push({ date: dateToYMD(d.getFullYear(), d.getMonth(), d.getDate()), day: d.getDate(), inMonth: false });
  }

  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const filteredEvents = (dateStr: string) => {
    return events.filter((ev) => ev.date === dateStr && (!category || category === "All" || ev.category === (category as unknown as CalendarEvent['category'])));
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-400">{d}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const isToday = cell.date === todayYmd;
          const isSelected = selectedDate === cell.date;
          const evs = filteredEvents(cell.date);

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              className={`min-h-[96px] cursor-pointer rounded-lg px-2 py-1 text-sm ${cell.inMonth ? 'bg-slate-900/30' : 'bg-transparent'} ${isSelected ? 'ring-1 ring-violet-500' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className={`text-sm font-medium ${isToday ? 'text-white' : 'text-slate-300'}`}>{cell.day}</div>
                {evs.length > 0 ? (
                  <div className="text-xs text-slate-400">{evs.length} event{evs.length > 1 ? 's' : ''}</div>
                ) : null}
              </div>

              <div className="mt-2 space-y-1">
                {evs.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent(ev); }}
                    className="overflow-hidden rounded-md bg-slate-800/60 px-2 py-1 text-xs text-slate-100 hover:bg-slate-800/80"
                    title={`${ev.title} ${ev.startTime}`}
                  >
                    <div className="font-medium truncate">{ev.title}</div>
                    <div className="text-[11px] text-slate-400">{formatTimeShort(`${ev.date}T${ev.startTime}`)}</div>
                  </div>
                ))}
                {evs.length > 3 ? (
                  <div className="mt-1 text-xs text-slate-400">+{evs.length - 3} more</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
