"use client";

import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  event: CalendarEvent | null;
  onClose: () => void;
};

export default function EventDetails({ event, onClose }: Props) {
  if (!event) return null;

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/5 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">{event.date}</p>
          <h4 className="text-lg font-semibold text-white">{event.title}</h4>
          <p className="mt-1 text-xs text-slate-400">{event.category}</p>
        </div>
        <div>
          <button onClick={onClose} className="rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-200">Close</button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-slate-300">{event.description}</div>
        <div className="text-sm text-slate-400">{formatTimeShort(`${event.date}T${event.startTime}`)} — {formatTimeShort(`${event.date}T${event.endTime ?? event.startTime}`)}</div>
        {event.attendees && event.attendees.length > 0 ? (
          <div>
            <div className="mt-2 text-xs text-slate-400">Attendees</div>
            <ul className="mt-1 list-disc list-inside text-sm text-slate-300">
              {event.attendees.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
