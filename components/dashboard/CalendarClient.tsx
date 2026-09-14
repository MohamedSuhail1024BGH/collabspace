"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/app/actions";
import CalendarGrid from "@/components/dashboard/CalendarGrid";
import CalendarWeekView from "@/components/dashboard/CalendarWeekView";
import CalendarAgendaView from "@/components/dashboard/CalendarAgendaView";
import CalendarToolbar, { type CalendarViewMode } from "@/components/dashboard/CalendarToolbar";
import EventDetails from "@/components/dashboard/EventDetails";
import EventForm, { type WorkspaceMemberItem } from "@/components/dashboard/EventForm";
import type { CalendarEvent } from "@/data/mock-data";
import type { ParsedCalendarEvent } from "@/lib/db/queries";

function toCalendarEvent(ev: ParsedCalendarEvent): CalendarEvent {
  return {
    id: ev.id,
    title: ev.title,
    date: ev.date,
    startTime: ev.startTime,
    endTime: ev.endTime ?? undefined,
    category: ev.category as CalendarEvent["category"],
    description: ev.description ?? undefined,
    attendees: ev.attendees,
  };
}

export function CalendarClient({
  initialEvents,
  workspaceMembers = [],
  userRole = "member",
  currentUser,
  workspaceId,
}: {
  initialEvents: ParsedCalendarEvent[];
  workspaceMembers?: WorkspaceMemberItem[];
  userRole?: string;
  currentUser?: { id: string; name: string; email: string };
  workspaceId?: string;
}) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth()); // 0-11
  const [viewMode, setViewMode] = useState<CalendarViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>(() => initialEvents.map(toCalendarEvent));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [category, setCategory] = useState<string>("All");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const isViewer = userRole === "viewer";

  // Synchronize state when initialEvents changes from server action refresh
  useEffect(() => {
    setEvents(initialEvents.map(toCalendarEvent));
  }, [initialEvents]);

  const todayYmd = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Top-level summary metrics
  const metrics = useMemo(() => {
    const todayCount = events.filter((ev) => ev.date === todayYmd).length;
    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    const thisMonthCount = events.filter((ev) => ev.date.startsWith(monthPrefix)).length;
    const deadlinesCount = events.filter((ev) => ev.category === "Deadline").length;
    const meetingsCount = events.filter((ev) => ev.category === "Meeting").length;
    return { todayCount, thisMonthCount, deadlinesCount, meetingsCount };
  }, [events, todayYmd, year, month]);

  const handlePrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const handleNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  const handleToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDate(todayYmd);
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
    const parts = date.split("-").map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const cellYear = parts[0];
      const cellMonth = parts[1] - 1;
      if (cellYear !== year || cellMonth !== month) {
        setYear(cellYear);
        setMonth(cellMonth);
      }
    }
    setSelectedDate(date);
    setSelectedEvent(null);
  }

  function handleSelectEvent(ev: CalendarEvent) {
    setSelectedEvent(ev);
    setSelectedDate(ev.date);
  }

  const handleOpenCreateForm = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setIsFormOpen(true);
  };

  const handleCreateEvent = async (evData: Omit<CalendarEvent, "id">) => {
    setIsSaving(true);
    const tempId = `ev-${Date.now()}`;
    const newEvent: CalendarEvent = { id: tempId, ...evData };

    setEvents((prev) => [...prev, newEvent]);
    setIsFormOpen(false);
    setSelectedDate(evData.date);
    setSelectedEvent(newEvent);

    const res = await createCalendarEventAction({
      id: tempId,
      workspaceId,
      title: evData.title,
      date: evData.date,
      startTime: evData.startTime,
      endTime: evData.endTime,
      category: evData.category,
      description: evData.description,
      attendees: evData.attendees,
    });

    if (res?.success && res.id) {
      const finalId = res.id;
      setEvents((prev) => prev.map((ev) => (ev.id === tempId ? { ...ev, id: finalId } : ev)));
      setSelectedEvent((cur) => (cur?.id === tempId ? { ...cur, id: finalId } : cur));
    }

    setIsSaving(false);
    router.refresh();
  };

  const handleUpdateEvent = async (evData: Omit<CalendarEvent, "id">) => {
    if (!editingEvent) return;

    setIsSaving(true);
    const updatedEvent: CalendarEvent = {
      ...editingEvent,
      ...evData,
    };

    setEvents((prev) =>
      prev.map((item) => (item.id === editingEvent.id ? updatedEvent : item)),
    );
    setSelectedEvent(updatedEvent);
    setIsFormOpen(false);
    setEditingEvent(null);

    await updateCalendarEventAction(editingEvent.id, {
      title: evData.title,
      date: evData.date,
      startTime: evData.startTime,
      endTime: evData.endTime,
      category: evData.category,
      description: evData.description,
      attendees: evData.attendees,
    });

    setIsSaving(false);
    router.refresh();
  };

  const handleDeletePrompt = (eventId: string) => {
    const target = events.find((e) => e.id === eventId);
    if (target) {
      setEventToDelete(target);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    const eventId = eventToDelete.id;
    setIsDeleting(true);

    setEvents((prev) => prev.filter((ev) => ev.id !== eventId));
    if (selectedEvent?.id === eventId) {
      setSelectedEvent(null);
    }
    setEventToDelete(null);
    setIsDeleting(false);

    startTransition(async () => {
      await deleteCalendarEventAction(eventId);
      router.refresh();
    });
  };

  const categories = ["All", "Meeting", "Planning", "Design", "Engineering", "Deadline", "Client", "Other"];

  return (
    <>
      <div className="space-y-6">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="calendar-metrics-banner">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Today</span>
              <span className="rounded-xl bg-violet-500/10 p-1.5 text-violet-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{metrics.todayCount}</div>
            <p className="mt-0.5 text-xs text-slate-400">Events scheduled today</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">This Month</span>
              <span className="rounded-xl bg-blue-500/10 p-1.5 text-blue-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{metrics.thisMonthCount}</div>
            <p className="mt-0.5 text-xs text-slate-400">Active monthly items</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Deadlines</span>
              <span className="rounded-xl bg-rose-500/10 p-1.5 text-rose-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{metrics.deadlinesCount}</div>
            <p className="mt-0.5 text-xs text-slate-400">Critical deadlines</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Meetings</span>
              <span className="rounded-xl bg-cyan-500/10 p-1.5 text-cyan-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{metrics.meetingsCount}</div>
            <p className="mt-0.5 text-xs text-slate-400">Team syncs & calls</p>
          </div>
        </div>

        {/* Main Calendar Section */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/20">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">Calendar</h3>
              <p className="text-xs text-slate-400 mt-1">
                Organize team schedules, deadlines, and project milestones.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={category}
                data-testid="calendar-category-filter"
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-2xl border border-white/10 bg-slate-950/60 px-3.5 py-2 text-sm text-slate-300 focus:border-violet-400/50 focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "All categories" : c}
                  </option>
                ))}
              </select>

              {!isViewer && (
                <button
                  type="button"
                  data-testid="calendar-add-event-btn"
                  onClick={handleOpenCreateForm}
                  className="rounded-2xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 shadow-lg shadow-violet-500/20"
                >
                  + Add event
                </button>
              )}
            </div>
          </div>

          <CalendarToolbar
            month={month}
            year={year}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {viewMode === "month" && (
                <CalendarGrid
                  year={year}
                  month={month}
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={handleSelectEvent}
                  category={category}
                />
              )}

              {viewMode === "week" && (
                <CalendarWeekView
                  year={year}
                  month={month}
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={handleSelectEvent}
                  category={category}
                />
              )}

              {viewMode === "agenda" && (
                <CalendarAgendaView
                  events={events}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                  onSelectEvent={handleSelectEvent}
                  category={category}
                />
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-4">
                {selectedEvent ? (
                  <EventDetails
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onEdit={!isViewer ? handleOpenEditForm : undefined}
                    onDelete={!isViewer ? handleDeletePrompt : undefined}
                    canManage={!isViewer}
                  />
                ) : selectedDate ? (
                  <div className="w-full rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Selected date
                        </p>
                        <h4 className="mt-1 text-lg font-semibold text-white">{selectedDate}</h4>
                      </div>
                      {!isViewer && (
                        <button
                          type="button"
                          onClick={handleOpenCreateForm}
                          className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition"
                        >
                          + Event
                        </button>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
                      {(eventsByDate.get(selectedDate) ?? [])
                        .filter((ev) => category === "All" || ev.category === category)
                        .map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleSelectEvent(ev)}
                            className="cursor-pointer rounded-2xl border border-white/5 bg-slate-900/60 p-3 text-slate-100 transition hover:bg-slate-850 hover:border-violet-500/30"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-sm text-white truncate">
                                {ev.title}
                              </div>
                              <div className="text-xs text-slate-400 whitespace-nowrap">
                                {ev.startTime}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                              <span>{ev.category}</span>
                              {ev.attendees && ev.attendees.length > 0 && (
                                <span>{ev.attendees.length} attendee{ev.attendees.length > 1 ? "s" : ""}</span>
                              )}
                            </div>
                          </div>
                        ))}

                      {(eventsByDate.get(selectedDate) ?? []).filter(
                        (ev) => category === "All" || ev.category === category,
                      ).length === 0 && (
                        <p className="text-xs text-slate-500 py-2">
                          No events scheduled for this day.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-center shadow-xl shadow-slate-950/20">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400 mb-3">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-white">No date selected</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Click any day on the calendar or select an event to view full details.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Create / Edit Event Modal */}
      {isFormOpen ? (
        <EventForm
          mode={editingEvent ? "edit" : "create"}
          initialEvent={editingEvent}
          initialDate={selectedDate ?? undefined}
          workspaceMembers={workspaceMembers}
          isSaving={isSaving}
          onCancel={() => {
            setIsFormOpen(false);
            setEditingEvent(null);
          }}
          onSave={editingEvent ? handleUpdateEvent : handleCreateEvent}
        />
      ) : null}

      {/* Delete Event Confirmation Modal */}
      {eventToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          data-testid="confirm-delete-event-modal"
        >
          <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-slate-900/95 p-6 shadow-2xl shadow-rose-950/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Delete Event</h3>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Are you sure you want to remove <strong>{eventToDelete.title}</strong>? This event will be permanently deleted from the workspace schedule.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                data-testid="cancel-delete-event-btn"
                onClick={() => setEventToDelete(null)}
                disabled={isDeleting}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-event-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-600/30 transition hover:bg-rose-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
