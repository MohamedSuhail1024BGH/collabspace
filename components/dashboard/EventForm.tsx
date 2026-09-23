"use client";

import { useMemo, useState, useEffect } from "react";
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded border border-outline/20 bg-surface-container-low p-5 sm:p-6 shadow-2xl custom-scrollbar">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-label-sm text-xs uppercase tracking-wider text-primary">
              {mode === "create" ? "New event" : "Edit event"}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-on-surface">
              {mode === "create" ? "Schedule an event" : "Update event details"}
            </h3>
          </div>
          <span className="font-label-sm rounded border border-outline/20 bg-surface-container px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            {mode === "create" ? "Draft" : "Event"}
          </span>
        </div>

        {isInvalidTimeRange && (
          <div className="mb-4 rounded border border-error/30 bg-error/10 p-3 text-xs text-error font-body-sm">
            <strong>Invalid time range:</strong> End time cannot be earlier than start time.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Title
            </label>
            <input
              type="text"
              required
              placeholder="Event title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Date
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  End Time
                </label>
                {durationInfo.text && !isInvalidTimeRange && (
                  <span className="inline-flex items-center gap-1 font-label-sm text-[10px] font-semibold text-primary">
                    <svg className="w-3 h-3 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{durationInfo.text}</span>
                  </span>
                )}
              </div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={`w-full rounded border bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:outline-none ${
                  isInvalidTimeRange
                    ? "border-error/50 focus:border-error"
                    : "border-outline/20 focus:border-primary"
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarEvent["category"])}
                className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface focus:border-primary focus:outline-none"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Attendees ({selectedAttendees.length})
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto rounded border border-outline/20 bg-surface-container-lowest p-2">
                {workspaceMembers.length > 0 ? (
                  workspaceMembers.map((m) => {
                    const isSelected = selectedAttendees.includes(m.user.name);
                    return (
                      <button
                        key={m.user.id}
                        type="button"
                        onClick={() => toggleAttendee(m.user.name)}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium transition ${
                          isSelected
                            ? "border-primary/40 bg-primary/20 text-primary"
                            : "border-outline/20 bg-surface-container text-on-surface-variant hover:text-on-surface hover:border-outline/40"
                        }`}
                      >
                        {isSelected ? (
                          <svg className="w-3 h-3 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-on-surface-variant shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                        <span>{m.user.name}</span>
                      </button>
                    );
                  })
                ) : (
                  <span className="text-xs text-on-surface-variant">No members available</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block font-label-sm text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Notes, agenda, or video call links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-outline/20 bg-surface-container-lowest px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded border border-outline/20 bg-surface-container px-3.5 py-1.5 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container-high hover:text-on-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim() || !date || !startTime || isInvalidTimeRange}
              className="rounded bg-primary px-4 py-1.5 text-xs font-semibold text-on-primary transition hover:bg-primary-container hover:text-on-primary-container disabled:opacity-50 shadow-sm"
            >
              {isSaving ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
