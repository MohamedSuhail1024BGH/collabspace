import { calendarEvents } from "@/data/mock-data";

export default function CalendarPage() {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Upcoming events</h3>
        <button type="button" className="text-sm text-violet-300 hover:text-violet-200">
          Add event
        </button>
      </div>

      <div className="space-y-3">
        {calendarEvents.map((event) => (
          <div key={`${event.title}-${event.date}`} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-center text-xs text-violet-200">
                <div>{event.date.split(" ")[0]}</div>
                <div className="mt-1 text-base font-semibold text-white">{event.date.split(" ")[1]}</div>
              </div>
              <div>
                <p className="font-medium text-white">{event.title}</p>
                <p className="text-sm text-slate-400">
                  {event.time} · {event.location}
                </p>
              </div>
            </div>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-200">
              {event.type}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
