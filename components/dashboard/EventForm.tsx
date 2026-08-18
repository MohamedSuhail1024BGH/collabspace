"use client";

import { useState } from "react";
import type { CalendarEvent } from "@/data/mock-data";

type Props = {
  initialDate?: string;
  onCancel: () => void;
  onCreate: (ev: Omit<CalendarEvent, 'id'>) => void;
};

export default function EventForm({ initialDate, onCancel, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(initialDate ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<CalendarEvent['category']>("Meeting");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !date || !startTime) return;
    onCreate({ title, date, startTime, endTime: endTime || startTime, category, description, attendees: [] });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-3 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
      <div>
        <label className="text-sm text-slate-400">Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-100" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-slate-400">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-100" />
        </div>
        <div>
          <label className="text-sm text-slate-400">Start</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-100" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-sm text-slate-400">End</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-100" />
        </div>
        <div>
          <label className="text-sm text-slate-400">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as CalendarEvent['category'])} className="mt-1 w-full rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-100">
            <option value="Meeting">Meeting</option>
            <option value="Planning">Planning</option>
            <option value="Design">Design</option>
            <option value="Engineering">Engineering</option>
            <option value="Deadline">Deadline</option>
            <option value="Client">Client</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-sm text-slate-400">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 h-24 w-full rounded-md bg-slate-900/40 px-3 py-2 text-sm text-slate-100" />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-2xl bg-slate-900/40 px-3 py-2 text-sm text-slate-200">Cancel</button>
        <button type="submit" className="rounded-2xl bg-violet-500 px-3 py-2 text-sm font-medium text-white">Create</button>
      </div>
    </form>
  );
}
