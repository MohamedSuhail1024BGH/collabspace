"use client";

import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  Meeting: "border-sky-500/30 bg-sky-500/10 text-sky-500 hover:brightness-110",
  Planning: "border-primary/30 bg-primary/10 text-primary hover:brightness-110",
  Design: "border-purple-500/30 bg-purple-500/10 text-purple-500 hover:brightness-110",
  Engineering: "border-amber-500/30 bg-amber-500/10 text-amber-500 hover:brightness-110",
  Deadline: "border-destructive/30 bg-destructive/10 text-destructive hover:brightness-110",
  Client: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:brightness-110",
  Other: "border-border bg-secondary text-foreground hover:brightness-110",
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
    <div data-testid="calendar-grid-view" className="rounded-2xl border border-border/80 bg-card p-3 sm:p-4 overflow-x-auto select-none shadow-xs">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 border-b border-border/80 pb-2.5 text-center text-xs font-medium uppercase text-muted-foreground w-full min-w-0 sm:min-w-[580px]">
        {daysOfWeek.map((d) => (
          <div key={d} className="py-1">
            <span className="sm:hidden">{d.charAt(0)}</span>
            <span className="hidden sm:inline">{d}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5 w-full min-w-0 sm:min-w-[580px]">
        {cells.map((cell) => {
          const isToday = cell.date === todayYmd;
          const isSelected = selectedDate === cell.date;
          const evs = filteredEvents(cell.date);

          return (
            <div
              key={cell.date}
              onClick={() => onSelectDate(cell.date)}
              className={cn(
                "min-h-[56px] sm:min-h-[105px] cursor-pointer rounded-xl p-1.5 sm:p-2 text-xs transition-all",
                isSelected
                  ? "border-2 border-primary bg-secondary/80 shadow-xs"
                  : isToday
                  ? "border-t-2 border-t-primary border-x border-b border-border bg-card hover:bg-secondary/60"
                  : cell.inMonth
                  ? "border border-border bg-card/60 hover:bg-secondary/50"
                  : "border border-border/40 bg-card/20 opacity-40 hover:opacity-70"
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-[11px] font-mono transition",
                    isToday
                      ? "bg-primary font-bold text-primary-foreground"
                      : isSelected
                      ? "font-bold text-primary"
                      : cell.inMonth
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {cell.day}
                </span>
                {evs.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                    {evs.length}
                  </Badge>
                )}
              </div>

              {/* Desktop chips */}
              <div className="hidden sm:flex flex-col gap-1 mt-1.5">
                {evs.slice(0, 2).map((ev) => {
                  const style =
                    categoryChipStyles[ev.category] ||
                    "border-border bg-secondary text-foreground";

                  return (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      className={cn(
                        "truncate rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition cursor-pointer",
                        style
                      )}
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
                  <div className="text-[10px] font-mono text-muted-foreground px-1">
                    +{evs.length - 2} more
                  </div>
                )}
              </div>

              {/* Mobile event indicator dots */}
              <div className="sm:hidden flex items-center justify-center gap-0.5 mt-1 flex-wrap">
                {evs.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className="size-1.5 rounded-full bg-primary"
                    title={ev.title}
                  />
                ))}
                {evs.length > 3 && (
                  <span className="text-[9px] font-mono text-primary font-bold">
                    +
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
