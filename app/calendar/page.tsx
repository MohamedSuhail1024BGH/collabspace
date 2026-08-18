"use client";

import { useMemo, useState } from "react";
import { calendarEvents as initialEvents, type CalendarEvent } from "@/data/mock-data";
import CalendarToolbar from "@/components/dashboard/CalendarToolbar";
import CalendarGrid from "@/components/dashboard/CalendarGrid";
import EventDetails from "@/components/dashboard/EventDetails";
import EventForm from "@/components/dashboard/EventForm";

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-11
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [category, setCategory] = useState<string>("All");
  const [showForm, setShowForm] = useState(false);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
    setSelectedDate(null);
    setSelectedEvent(null);
  };
  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
    setSelectedDate(null);
    setSelectedEvent(null);
  };
  const handleToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    return map;
  }, [events]);

  function handleSelectDate(date: string) {
    setSelectedDate(date);
    setSelectedEvent(null);
  }

  function handleSelectEvent(ev: CalendarEvent) {
    setSelectedEvent(ev);
  }

  function handleCreateEvent(ev: Omit<CalendarEvent, 'id'>) {
    const newEvent: CalendarEvent = { id: `ev-${Date.now()}`, ...ev };
    setEvents((prev) => [...prev, newEvent]);
    setShowForm(false);
    setSelectedDate(ev.date);
    setSelectedEvent(newEvent);
  }

  const categories = ["All", "Meeting", "Planning", "Design", "Engineering", "Deadline", "Client", "Other"];

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-slate-950/20">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Calendar</h3>
        <div className="flex items-center gap-2">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="hidden rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 sm:block">
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <button onClick={() => setShowForm(true)} className="rounded-2xl bg-violet-500 px-3 py-2 text-sm font-medium text-white">Add event</button>
        </div>
      </div>

      <CalendarToolbar month={month} year={year} onPrev={handlePrev} onNext={handleNext} onToday={handleToday} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="col-span-2">
          <CalendarGrid
            year={year}
            month={month}
            events={events}
            selectedDate={selectedDate ?? null}
            onSelectDate={handleSelectDate}
            onSelectEvent={handleSelectEvent}
            category={category}
          />
        </div>

        <div className="col-span-1">
          <div className="space-y-3">
            {selectedEvent ? (
              <EventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
            ) : selectedDate ? (
              <div className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">Selected</p>
                <h4 className="mt-2 text-lg font-semibold text-white">{selectedDate}</h4>
                <div className="mt-3 space-y-2">
                  {(eventsByDate.get(selectedDate) ?? []).filter((ev) => category === 'All' || ev.category === category).map((ev) => (
                    <div key={ev.id} className="rounded-md bg-slate-800/60 px-3 py-2 text-sm text-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-xs text-slate-400">{ev.startTime}</div>
                      </div>
                      <div className="text-xs text-slate-400">{ev.category}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-950/40 p-4">
                <p className="text-sm text-slate-400">No selection</p>
                <p className="mt-2 text-sm text-slate-300">Select a date or event to view details.</p>
              </div>
            )}

            {showForm ? (
              <EventForm initialDate={selectedDate ?? undefined} onCancel={() => setShowForm(false)} onCreate={handleCreateEvent} />
            ) : null}

          </div>
        </div>
      </div>
    </section>
  );
}
