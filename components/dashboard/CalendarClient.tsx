"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEventAction, updateCalendarEventAction, deleteCalendarEventAction } from "@/app/actions-calendar";
import CalendarGrid from "@/components/dashboard/CalendarGrid";
import CalendarWeekView from "@/components/dashboard/CalendarWeekView";
import CalendarAgendaView from "@/components/dashboard/CalendarAgendaView";
import CalendarToolbar, { type CalendarViewMode } from "@/components/dashboard/CalendarToolbar";
import EventDetails from "@/components/dashboard/EventDetails";
import EventForm, { type WorkspaceMemberItem } from "@/components/dashboard/EventForm";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  Users,
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="calendar-metrics-banner">
          <Card className="p-4 border-border/60 hover:bg-card/80 transition shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono">Today</span>
              <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                <Clock className="size-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground tracking-tight">{metrics.todayCount}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Events scheduled today</p>
          </Card>

          <Card className="p-4 border-border/60 hover:bg-card/80 transition shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono">This Month</span>
              <span className="rounded-md bg-secondary/15 p-1.5 text-secondary-foreground">
                <CalendarIcon className="size-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground tracking-tight">{metrics.thisMonthCount}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Active monthly items</p>
          </Card>

          <Card className="p-4 border-border/60 hover:bg-card/80 transition shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono">Deadlines</span>
              <span className="rounded-md bg-destructive/10 p-1.5 text-destructive">
                <AlertCircle className="size-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground tracking-tight">{metrics.deadlinesCount}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Critical deadlines</p>
          </Card>

          <Card className="p-4 border-border/60 hover:bg-card/80 transition shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold uppercase tracking-wider font-mono">Meetings</span>
              <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                <Users className="size-4" />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-foreground tracking-tight">{metrics.meetingsCount}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Team syncs & calls</p>
          </Card>
        </div>

        {/* Main Calendar Section */}
        <Card className="p-4 sm:p-5 border-border/60 shadow-xs">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3.5 border-b border-border/60">
            <div>
              <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
                <CalendarDays className="size-5 text-primary" />
                <span>Calendar</span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Organize team schedules, deadlines, and project milestones.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <select
                value={category}
                data-testid="calendar-category-filter"
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-background text-foreground">
                    {c === "All" ? "All categories" : c}
                  </option>
                ))}
              </select>

              {!isViewer && (
                <Button
                  size="sm"
                  data-testid="calendar-add-event-btn"
                  onClick={handleOpenCreateForm}
                  className="h-9 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="size-3.5 mr-1" />
                  Add event
                </Button>
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

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mt-4">
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
                  <Card className="p-4 border-border/60 bg-muted/10 shadow-xs">
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                          Selected date
                        </p>
                        <h4 className="mt-0.5 text-sm font-semibold text-foreground">{selectedDate}</h4>
                      </div>
                      {!isViewer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenCreateForm}
                          className="h-7 px-2 text-xs text-primary"
                        >
                          <Plus className="size-3 mr-1" />
                          Event
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                      {(eventsByDate.get(selectedDate) ?? [])
                        .filter((ev) => category === "All" || ev.category === category)
                        .map((ev) => (
                          <div
                            key={ev.id}
                            onClick={() => handleSelectEvent(ev)}
                            className="cursor-pointer rounded-lg border border-border/50 bg-card p-3 text-foreground transition hover:border-primary/50 hover:shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-medium text-xs text-foreground truncate">
                                {ev.title}
                              </div>
                              <div className="text-[11px] text-muted-foreground whitespace-nowrap font-mono">
                                {ev.startTime}
                              </div>
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                              <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 h-4">
                                {ev.category}
                              </Badge>
                              {ev.attendees && ev.attendees.length > 0 && (
                                <span>{ev.attendees.length} attendee{ev.attendees.length > 1 ? "s" : ""}</span>
                              )}
                            </div>
                          </div>
                        ))}

                      {(eventsByDate.get(selectedDate) ?? []).filter(
                        (ev) => category === "All" || ev.category === category,
                      ).length === 0 && (
                        <p className="text-xs text-muted-foreground py-4 text-center font-mono">
                          No events scheduled for this day.
                        </p>
                      )}
                    </div>
                  </Card>
                ) : (
                  <Card className="p-6 border-border/60 text-center bg-muted/10">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                      <CalendarDays className="size-5" />
                    </div>
                    <p className="text-xs font-semibold text-foreground">No date selected</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Click any day on the calendar or select an event to view full details.
                    </p>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </Card>
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          data-testid="confirm-delete-event-modal"
        >
          <Card className="w-full max-w-md p-5 shadow-2xl border-destructive/40">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 text-destructive shrink-0">
                <Trash2 className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Delete Event</h3>
                <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to remove <strong className="text-foreground">{eventToDelete.title}</strong>? This event will be permanently deleted from the workspace schedule.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                data-testid="cancel-delete-event-btn"
                onClick={() => setEventToDelete(null)}
                disabled={isDeleting}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                data-testid="confirm-delete-event-btn"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-8 text-xs font-semibold"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Event"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
