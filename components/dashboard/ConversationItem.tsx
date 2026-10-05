"use client";

import type { Conversation } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  conversation: Conversation;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export default function ConversationItem({ conversation, selected, onSelect }: Props) {
  const isChannel =
    conversation.type === "channel" ||
    (conversation.type !== "direct" &&
      (conversation.id.startsWith("conv-design") ||
        conversation.id.startsWith("conv-product") ||
        conversation.id.startsWith("conv-eng") ||
        conversation.id.startsWith("conv-ops") ||
        conversation.name.startsWith("#")));

  // Format channel name cleanly (ensure single #)
  const displayName = isChannel
    ? conversation.name.startsWith("#")
      ? conversation.name.slice(1)
      : conversation.name
    : conversation.name;

  return (
    <button
      type="button"
      data-testid={`conversation-item-${conversation.id}`}
      onClick={() => onSelect?.(conversation.id)}
      className={cn(
        "group flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all select-none",
        selected
          ? "bg-secondary text-foreground font-medium border-l-2 border-primary shadow-xs"
          : "border-l-2 border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
        {isChannel ? (
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold transition-colors",
              selected
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground border border-border group-hover:text-foreground"
            )}
          >
            <Hash className="size-4" />
          </div>
        ) : (
          <UserAvatar
            avatar={conversation.avatar}
            name={conversation.name}
            size="sm"
            showStatus={true}
            statusColor={conversation.online ? "bg-emerald-500" : "bg-muted-foreground/40"}
          />
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span
              className={cn(
                "truncate text-xs sm:text-sm",
                selected
                  ? "font-semibold text-foreground"
                  : "font-medium text-foreground group-hover:text-primary transition-colors"
              )}
            >
              {displayName}
            </span>
            {conversation.lastTimestamp && (
              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                {formatTimeShort(conversation.lastTimestamp)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-[11px] text-muted-foreground truncate line-clamp-1">
              {conversation.lastMessage || (isChannel ? "Channel ready" : "Direct thread")}
            </p>
            {conversation.unread > 0 && (
              <Badge variant="default" className="size-4 p-0 flex items-center justify-center text-[9px] font-bold rounded-full shrink-0">
                {conversation.unread}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
