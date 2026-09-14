"use client";

import type { Conversation } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

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

  return (
    <button
      type="button"
      data-testid={`conversation-item-${conversation.id}`}
      onClick={() => onSelect?.(conversation.id)}
      className={`group flex w-full items-start gap-3 rounded-2xl p-3 text-left transition ${
        selected
          ? "border border-white/15 bg-slate-900/90 shadow-md ring-1 ring-white/10"
          : "border border-transparent bg-transparent hover:border-white/5 hover:bg-slate-900/40"
      }`}
    >
      <div className="relative shrink-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold text-white shadow ${conversation.color}`}
        >
          {isChannel ? "#" : conversation.initials}
        </div>
        {conversation.online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
        )}
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-1">
          <p className="font-semibold text-sm text-white truncate">{conversation.name}</p>
          <span className="text-[10px] text-slate-400 shrink-0">
            {conversation.lastTimestamp ? formatTimeShort(conversation.lastTimestamp) : ""}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-xs text-slate-400 truncate line-clamp-1">
            {conversation.lastMessage || "No messages yet"}
          </p>
          {conversation.unread > 0 && (
            <span className="theme-btn-primary flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow">
              {conversation.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
