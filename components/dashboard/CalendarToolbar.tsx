"use client";


type Props = {
  month: number; // 0-11
  year: number;
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

export default function CalendarToolbar({ month, year, onPrev, onNext, onToday }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-2xl bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60"
        >
          Prev
        </button>

        <button
          type="button"
          onClick={onToday}
          className="rounded-2xl bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60"
        >
          Today
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-2xl bg-slate-900/40 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60"
        >
          Next
        </button>

        <div className="ml-4 text-lg font-semibold text-white">
          {monthNames[month]} {year}
        </div>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">Month view</div>
      </div>
    </div>
  );
}
