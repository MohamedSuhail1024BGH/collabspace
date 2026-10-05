"use client";

import type { CalendarEvent } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, X, Edit3, Trash2 } from "lucide-react";

type Props = {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (eventId: string) => void;
  canManage?: boolean;
};

const categoryBadgeVariants: Record<string, "default" | "secondary" | "outline" | "success" | "warning" | "info" | "destructive"> = {
  Meeting: "info",
  Planning: "default",
  Design: "secondary",
  Engineering: "warning",
  Deadline: "destructive",
  Client: "success",
  Other: "outline",
};

export default function EventDetails({
  event,
  onClose,
  onEdit,
  onDelete,
  canManage = true,
}: Props) {
  if (!event) return null;

  const badgeVariant = categoryBadgeVariants[event.category] || "secondary";

  return (
    <Card
      className="w-full text-foreground shadow-md"
      data-testid="event-details-card"
    >
      <CardHeader className="p-4 pb-3 flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-mono text-muted-foreground uppercase">
            {event.date}
          </span>
          <h4 className="text-base font-bold text-foreground leading-snug">{event.title}</h4>
          <Badge variant={badgeVariant} className="text-[10px] font-mono w-fit mt-1">
            {event.category}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-7 text-muted-foreground hover:text-foreground"
          title="Close details"
        >
          <X className="size-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-4 pt-1 flex flex-col gap-3 text-xs">
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 text-primary" />
            <span className="uppercase tracking-wider font-semibold">Time Window</span>
          </div>
          <p className="mt-1 font-mono text-xs font-semibold text-foreground">
            {formatTimeShort(`${event.date}T${event.startTime}`)} —{" "}
            {formatTimeShort(`${event.date}T${event.endTime ?? event.startTime}`)}
          </p>
        </div>

        {event.description ? (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Description
            </span>
            <p className="mt-1 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        ) : null}

        {event.attendees && event.attendees.length > 0 ? (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Attendees ({event.attendees.length})
            </span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {event.attendees.map((attendee) => (
                <Badge
                  key={attendee}
                  variant="outline"
                  className="gap-1.5 text-xs font-mono py-1 px-2"
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {attendee.slice(0, 1).toUpperCase()}
                  </span>
                  <span>{attendee}</span>
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {canManage && (
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-1">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                data-testid="event-edit-btn"
                onClick={() => onEdit(event)}
                className="h-8 gap-1.5 text-xs"
              >
                <Edit3 className="size-3.5" />
                <span>Edit event</span>
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                data-testid="event-delete-btn"
                onClick={() => onDelete(event.id)}
                className="h-8 gap-1.5 text-xs"
              >
                <Trash2 className="size-3.5" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
