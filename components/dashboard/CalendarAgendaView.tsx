"use client";

import { useMemo } from "react";
import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  events: CalendarEvent[];
  selectedDate?: string | null;
  onSelectEvent: (ev: CalendarEvent) => void;
  onSelectDate: (date: string) => void;
  category?: string;
};

const categoryBadgeVariants: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive"> = {
  Meeting: "info",
  Planning: "default",
  Design: "secondary",
  Engineering: "warning",
  Deadline: "destructive",
  Client: "success",
  Other: "outline",
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
        className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center"
      >
        <div className="size-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground mx-auto mb-3">
          <CalendarIcon className="size-5" />
        </div>
        <h4 className="text-base font-semibold text-foreground">No events found</h4>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          {category && category !== "All"
            ? `There are no scheduled events categorized under "${category}".`
            : 'No events are currently scheduled in this workspace. Click "+ Add event" to create one.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="calendar-agenda-view">
      {groupedByDate.map(([dateStr, dayEvents]) => {
        const { label, tag } = formatDateHeading(dateStr);
        const isSelected = selectedDate === dateStr;

        return (
          <Card
            key={dateStr}
            className={cn(
              "overflow-hidden transition-all",
              isSelected && "border-primary shadow-xs"
            )}
          >
            <div
              onClick={() => onSelectDate(dateStr)}
              className="flex cursor-pointer items-center justify-between border-b border-border px-4 py-2.5 bg-secondary/30"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  {label}
                </span>
                {tag && (
                  <Badge variant="default" className="text-[10px] font-mono px-2 py-0">
                    {tag}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="divide-y divide-border">
              {dayEvents.map((ev) => {
                const badgeVariant = categoryBadgeVariants[ev.category] || "secondary";
                return (
                  <div
                    key={ev.id}
                    onClick={() => {
                      onSelectDate(ev.date);
                      onSelectEvent(ev);
                    }}
                    className="flex cursor-pointer flex-col gap-2 p-3.5 transition sm:flex-row sm:items-center sm:justify-between hover:bg-secondary/40"
                  >
                    <div className="flex items-start gap-3">
                      <div className="min-w-[80px] text-xs font-mono font-medium text-primary">
                        {formatTimeShort(`${ev.date}T${ev.startTime}`)}
                        {ev.endTime && (
                          <span className="block text-[10px] text-muted-foreground">
                            to {formatTimeShort(`${ev.date}T${ev.endTime}`)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-medium text-foreground">{ev.title}</p>
                        {ev.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Badge variant={badgeVariant} className="text-[10px] font-mono">
                        {ev.category}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
