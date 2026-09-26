"use client";

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
    <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev}
            className="rounded bg-surface-container hover:bg-surface-container-highest border border-outline/20 px-2.5 py-1.5 text-xs font-mono text-on-surface transition active:scale-95 cursor-pointer"
          >
            Prev
          </button>

          <button
            type="button"
            onClick={onToday}
            className="rounded bg-surface-container hover:bg-surface-container-highest border border-outline/20 px-3 py-1.5 text-xs font-mono text-primary transition active:scale-95 cursor-pointer"
          >
            Today
          </button>

          <button
            type="button"
            onClick={onNext}
            className="rounded bg-surface-container hover:bg-surface-container-highest border border-outline/20 px-2.5 py-1.5 text-xs font-mono text-on-surface transition active:scale-95 cursor-pointer"
          >
            Next
          </button>
        </div>

        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-on-surface">
          {monthNames[month]} {year}
        </h3>
      </div>

      {/* View Mode Switching Controls */}
      {onViewModeChange && (
        <div className="flex items-center rounded bg-surface-container-lowest border border-outline/20 p-0.5 w-full sm:w-auto">
          <button
            type="button"
            data-testid="calendar-view-month-btn"
            onClick={() => onViewModeChange("month")}
            className={`flex-1 sm:flex-initial text-center rounded px-3 py-1.5 text-xs font-mono transition active:scale-95 cursor-pointer ${
              viewMode === "month"
                ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            data-testid="calendar-view-week-btn"
            onClick={() => onViewModeChange("week")}
            className={`flex-1 sm:flex-initial text-center rounded px-3 py-1.5 text-xs font-mono transition active:scale-95 cursor-pointer ${
              viewMode === "week"
                ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            data-testid="calendar-view-agenda-btn"
            onClick={() => onViewModeChange("agenda")}
            className={`flex-1 sm:flex-initial text-center rounded px-3 py-1.5 text-xs font-mono transition active:scale-95 cursor-pointer ${
              viewMode === "agenda"
                ? "bg-surface-container-highest text-on-surface font-semibold shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Agenda
          </button>
        </div>
      )}
    </div>
  );
}
