"use client";

import { useMemo, useState, useEffect } from "react";
import type { CalendarEvent } from "@/data/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkspaceMemberItem = {
  membershipId: string;
  role: string;
  status?: string;
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

  const toggleAttendee = (memberName: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(memberName) ? prev.filter((a) => a !== memberName) : [...prev, memberName],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !startTime || isInvalidTimeRange) return;

    onSave({
      title: title.trim(),
      date,
      startTime,
      endTime: endTime || undefined,
      category,
      description: description.trim() || undefined,
      attendees: selectedAttendees.length > 0 ? selectedAttendees : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CalendarIcon className="size-5 text-primary" />
              {mode === "create" ? "Create New Event" : "Update Event"}
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              Schedule
            </Badge>
          </div>
          <DialogDescription>
            {mode === "create"
              ? "Schedule a meeting, planning session, or team milestone."
              : "Update event details, timing, or attendees."}
          </DialogDescription>
        </DialogHeader>

        {isInvalidTimeRange && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <strong>Invalid time range:</strong> End time cannot be earlier than start time.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <Field>
            <FieldLabel htmlFor="event-title">Title</FieldLabel>
            <Input
              id="event-title"
              data-testid="event-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sprint Retro, Product Demo"
              required
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="event-date">Date</FieldLabel>
              <Input
                id="event-date"
                type="date"
                data-testid="event-date-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="font-mono h-9"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="event-category">Category</FieldLabel>
              <select
                id="event-category"
                data-testid="event-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as CalendarEvent["category"])}
                className="w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer h-9 font-mono"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="event-start-time">Start Time</FieldLabel>
              <Input
                id="event-start-time"
                type="time"
                data-testid="event-start-time-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="font-mono h-9"
              />
            </Field>

            <Field>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="event-end-time">End Time</FieldLabel>
                {durationInfo.text && !durationInfo.isNegative && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ({durationInfo.text})
                  </span>
                )}
              </div>
              <Input
                id="event-end-time"
                type="time"
                data-testid="event-end-time-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={cn("font-mono h-9", isInvalidTimeRange && "border-destructive")}
              />
              {isInvalidTimeRange && (
                <p className="text-xs text-destructive mt-1">End time must be after start time</p>
              )}
            </Field>
          </div>

          <Field>
            <FieldLabel>Attendees</FieldLabel>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-lg border border-border bg-secondary/30 p-2">
              {workspaceMembers.length > 0 ? (
                workspaceMembers.map((m) => {
                  const isSelected = selectedAttendees.includes(m.user.name);
                  return (
                    <button
                      key={m.user.id}
                      type="button"
                      data-testid={`attendee-checkbox-${m.user.id}`}
                      onClick={() => toggleAttendee(m.user.name)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition cursor-pointer",
                        isSelected
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isSelected ? (
                        <Check className="size-3 text-primary shrink-0" />
                      ) : (
                        <Plus className="size-3 text-muted-foreground shrink-0" />
                      )}
                      <span>{m.user.name}</span>
                    </button>
                  );
                })
              ) : (
                <span className="text-xs text-muted-foreground">No members available</span>
              )}
            </div>
          </Field>

          <Field>
            <FieldLabel htmlFor="event-description">Description</FieldLabel>
            <Textarea
              id="event-description"
              data-testid="event-description-input"
              rows={3}
              placeholder="Notes, agenda, or video call links..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              data-testid="event-cancel-btn"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="event-save-btn"
              disabled={isSaving || !title.trim() || !date || !startTime || isInvalidTimeRange}
            >
              {isSaving ? "Saving..." : mode === "create" ? "Create event" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
