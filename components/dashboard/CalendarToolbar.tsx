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
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-2xl border border-white/5 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:border-white/10"
        >
          Prev
        </button>

        <button
          type="button"
          onClick={onToday}
          className="rounded-2xl border border-white/5 bg-slate-900/60 px-3.5 py-2 text-xs font-semibold text-violet-300 transition hover:bg-slate-800 hover:border-white/10"
        >
          Today
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-2xl border border-white/5 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800 hover:border-white/10"
        >
          Next
        </button>

        <div className="ml-3 text-lg font-bold tracking-tight text-white">
          {monthNames[month]} <span className="text-violet-400 font-normal">{year}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center rounded-2xl border border-white/10 bg-slate-950/70 p-1 shadow-inner">
          {(["month", "week", "agenda"] as CalendarViewMode[]).map((mode) => {
            const isActive = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                data-testid={`calendar-view-${mode}-btn`}
                onClick={() => onViewModeChange?.(mode)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold capitalize transition ${
                  isActive
                    ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {mode === "month" ? "Month" : mode === "week" ? "Week" : "Agenda"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
