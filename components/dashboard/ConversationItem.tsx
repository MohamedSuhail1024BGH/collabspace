"use client";

import type { Conversation } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { UserAvatar } from "@/components/ui/UserAvatar";

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
      className={`group flex w-full items-center justify-between gap-2.5 rounded px-2.5 py-2 text-left transition-colors select-none ${
        selected
          ? "bg-surface-container-highest text-on-surface font-medium border-l-2 border-primary shadow-xs"
          : "border-l-2 border-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden">
        {isChannel ? (
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-xs font-bold transition-colors ${
              selected
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-surface-container-high text-on-surface-variant/80 border border-outline/10 group-hover:text-on-surface"
            }`}
          >
            #
          </div>
        ) : (
          <UserAvatar
            avatar={conversation.avatar}
            name={conversation.name}
            size="sm"
            showStatus={true}
            statusColor={conversation.online ? "bg-secondary" : "bg-outline/40"}
          />
        )}

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span
              className={`truncate text-xs ${
                selected ? "font-semibold text-on-surface" : "font-medium text-on-surface group-hover:text-primary transition-colors"
              }`}
            >
              {displayName}
            </span>
            {conversation.lastTimestamp && (
              <span className="text-[10px] font-mono text-on-surface-variant/60 shrink-0">
                {formatTimeShort(conversation.lastTimestamp)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p className="text-[11px] font-mono text-on-surface-variant truncate line-clamp-1">
              {conversation.lastMessage || (isChannel ? "Channel ready" : "Direct thread")}
            </p>
            {conversation.unread > 0 && (
              <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1.5 text-[9px] font-mono font-bold text-on-primary shadow-xs">
                {conversation.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
