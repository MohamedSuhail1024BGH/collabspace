"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarViewMode = "month" | "week" | "agenda";

type Props = {
  month: number; // 0-11
  year: number;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function CalendarToolbar({
  month,
  year,
  viewMode = "month",
  onViewModeChange,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={onPrev}
            className="size-8 rounded-full border-border/80"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 px-3.5 text-xs font-medium rounded-full border-border/80"
          >
            Today
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onNext}
            className="size-8 rounded-full border-border/80"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-primary hidden sm:inline-block" />
          <h2 className="text-sm sm:text-base font-bold text-foreground">
            {monthNames[month]} {year}
          </h2>
        </div>
      </div>

      {/* View Mode Switching Controls */}
      {onViewModeChange && (
        <div className="flex items-center rounded-xl bg-secondary/80 border border-border/80 p-1 w-full sm:w-auto">
          <button
            type="button"
            data-testid="calendar-view-month-btn"
            onClick={() => onViewModeChange("month")}
            className={cn(
              "flex-1 sm:flex-initial text-center rounded-lg px-3.5 py-1 text-xs font-medium transition active:scale-95 cursor-pointer",
              viewMode === "month"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Month
          </button>
          <button
            type="button"
            data-testid="calendar-view-week-btn"
            onClick={() => onViewModeChange("week")}
            className={cn(
              "flex-1 sm:flex-initial text-center rounded-lg px-3.5 py-1 text-xs font-medium transition active:scale-95 cursor-pointer",
              viewMode === "week"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Week
          </button>
          <button
            type="button"
            data-testid="calendar-view-agenda-btn"
            onClick={() => onViewModeChange("agenda")}
            className={cn(
              "flex-1 sm:flex-initial text-center rounded-lg px-3.5 py-1 text-xs font-medium transition active:scale-95 cursor-pointer",
              viewMode === "agenda"
                ? "bg-card text-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Agenda
          </button>
        </div>
      )}
    </div>
  );
}
