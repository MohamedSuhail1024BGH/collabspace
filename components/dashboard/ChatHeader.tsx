"use client";

import type { Conversation } from "@/data/mock-data";

type Props = {
  conversation: Conversation;
  onBack?: () => void;
};

export default function ChatHeader({ conversation, onBack }: Props) {
  const isChannel =
    conversation.type === "channel" ||
    (conversation.type !== "direct" &&
      (conversation.id.startsWith("conv-design") ||
        conversation.id.startsWith("conv-product") ||
        conversation.id.startsWith("conv-eng") ||
        conversation.id.startsWith("conv-ops") ||
        conversation.name.startsWith("#")));

  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-slate-950/40 px-4 py-3">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mr-1 rounded-xl border border-white/10 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:text-white sm:hidden"
          >
            ← Back
          </button>
        )}

        <div className="relative">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold text-white shadow ${conversation.color}`}
          >
            {isChannel ? "#" : conversation.initials}
          </div>
          {conversation.online && (
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-emerald-500" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-base text-white">{conversation.name}</h4>
            <span className="rounded-full border border-white/10 bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-300">
              {isChannel ? "Team Channel" : "Direct Message"}
            </span>
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="font-medium text-slate-300">{conversation.role}</span>
            <span>•</span>
            <span className={conversation.online ? "text-emerald-400" : "text-slate-500"}>
              {conversation.online ? "Active Now" : "Offline"}
            </span>
          </p>
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
        <span className="rounded-xl border border-white/5 bg-slate-900/60 px-3 py-1.5">
          {conversation.messages.length} message{conversation.messages.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
