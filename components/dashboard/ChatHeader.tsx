"use client";

import type { Conversation } from "@/data/mock-data";

type Props = {
  conversation: Conversation;
  onBack?: () => void;
};

export default function ChatHeader({ conversation, onBack }: Props) {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 pb-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="mr-2 rounded-md bg-slate-900/40 px-2 py-1 text-sm text-slate-200 sm:hidden"
        >
          Back
        </button>
      ) : null}

      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white ${conversation.color}`}>
          {conversation.initials}
        </div>
        <div>
          <p className="font-medium text-white">{conversation.name}</p>
          <p className="text-xs text-slate-400">{conversation.role} • {conversation.online ? "Online" : "Offline"}</p>
        </div>
      </div>
    </div>
  );
}
