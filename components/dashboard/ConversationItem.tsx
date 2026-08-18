"use client";

import type { Conversation } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  conversation: Conversation;
  selected?: boolean;
  onSelect?: (id: string) => void;
};

export default function ConversationItem({ conversation, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(conversation.id)}
      className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition hover:bg-slate-900/50 ${
        selected ? "bg-slate-900/60 ring-1 ring-white/5" : ""
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${conversation.color}`}>{conversation.initials}</div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <p className="font-medium text-white">{conversation.name}</p>
            <p className="text-xs text-slate-400">{conversation.role}</p>
          </div>
          <div className="flex items-center gap-2">
          <p className="text-xs text-slate-400">{formatTimeShort(conversation.lastTimestamp)}</p>
            {conversation.unread > 0 ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-500 px-2 text-xs font-medium text-white">
                {conversation.unread}
              </span>
            ) : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-slate-300 line-clamp-2">{conversation.lastMessage}</p>
      </div>
    </button>
  );
}
