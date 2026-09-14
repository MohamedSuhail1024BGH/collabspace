"use client";

import { useMemo, useState } from "react";
import type { CalendarEvent } from "@/data/mock-data";

export type WorkspaceMemberItem = {
  membershipId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    avatar: string | null;
  };
};

type Props = {
  mode?: "create" | "edit";
  initialEvent?: CalendarEvent | null;
  initialDate?: string;
  workspaceMembers?: WorkspaceMemberItem[];
  isSaving?: boolean;
  onCancel: () => void;
  onSave: (ev: Omit<CalendarEvent, "id">) => void;
};

const categoryOptions: CalendarEvent["category"][] = [
  "Meeting",
  "Planning",
  "Design",
  "Engineering",
  "Deadline",
  "Client",
  "Other",
];

function getLocalTodayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeDuration(start: string, end: string): { text: string | null; isNegative: boolean } {
  if (!start || !end) return { text: null, isNegative: false };
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) {
    return { text: null, isNegative: false };
  }
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  const diff = endMinutes - startMinutes;
  if (diff < 0) {
    return { text: null, isNegative: true };
  }
  if (diff === 0) return { text: "0 min", isNegative: false };
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  if (hours === 0) return { text: `${mins} mins`, isNegative: false };
  if (mins === 0) return { text: `${hours} hr${hours > 1 ? "s" : ""}`, isNegative: false };
  return { text: `${hours} hr${hours > 1 ? "s" : ""} ${mins} min`, isNegative: false };
}

export default function EventForm({
  mode = "create",
  initialEvent,
  initialDate,
  workspaceMembers = [],
  isSaving = false,
  onCancel,
  onSave,
}: Props) {
  const [title, setTitle] = useState(initialEvent?.title ?? "");
  const [date, setDate] = useState(
    initialEvent?.date ?? initialDate ?? getLocalTodayYmd(),
  );
  const [startTime, setStartTime] = useState(initialEvent?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(initialEvent?.endTime ?? "10:00");
  const [category, setCategory] = useState<CalendarEvent["category"]>(
    initialEvent?.category ?? "Meeting",
  );
  const [description, setDescription] = useState(initialEvent?.description ?? "");
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>(
    initialEvent?.attendees ?? [],
  );

  const durationInfo = useMemo(() => {
    return computeDuration(startTime, endTime);
  }, [startTime, endTime]);

  const isInvalidTimeRange = durationInfo.isNegative;

  const toggleAttendee = (name: string) => {
    setSelectedAttendees((current) =>
      current.includes(name) ? current.filter((n) => n !== name) : [...current, name],
    );
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || isInvalidTimeRange) return;
    onSave({
      title: title.trim(),
      date,
      startTime,
      endTime: endTime || startTime,
      category,
      description: description.trim(),
      attendees: selectedAttendees,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl shadow-slate-950/50">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-violet-200">
              {mode === "create" ? "New event" : "Edit event"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {mode === "create" ? "Schedule an event" : "Update event details"}
            </h3>
          </div>
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-violet-200">
            {mode === "create" ? "Draft" : "Event"}
          </span>
        </div>

        {isInvalidTimeRange && (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <strong>Invalid time range:</strong> End time cannot be earlier than start time.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="Event title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-violet-400/50 focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  End Time
                </label>
                {durationInfo.text && !isInvalidTimeRange && (
                  <span className="text-[10px] font-semibold text-violet-300">
                    ⏱ {durationInfo.text}
                  </span>
                )}
              </div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full rounded-2xl border bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none ${
                  isInvalidTimeRange
                    ? "border-rose-500/50 focus:border-rose-400"
                    : "border-white/10 focus:border-violet-400/50"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarEvent["category"])}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-sm text-white focus:border-violet-400/50 focus:outline-none"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attendees ({selectedAttendees.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/70 p-2">
                {workspaceMembers.length > 0 ? (
                  workspaceMembers.map((m) => {
                    const isSelected = selectedAttendees.includes(m.user.name);
                    return (
                      <button
                        key={m.user.id}
                        type="button"
                        onClick={() => toggleAttendee(m.user.name)}
                        className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                          isSelected
                            ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
                            : "border-white/10 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-white/20"
                        }`}
                      >
                        <span>{isSelected ? "✓" : "+"}</span>
                        <span>{m.user.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500">No members available</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Notes, agenda, or video call links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 py-2 text-sm text-white placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !date || !startTime || isInvalidTimeRange}
              className="rounded-2xl bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50 shadow-lg shadow-violet-600/30"
            >
              {isSaving ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
