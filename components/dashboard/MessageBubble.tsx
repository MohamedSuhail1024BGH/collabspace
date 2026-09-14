"use client";

import { useState } from "react";
import type { Message } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
};

export default function MessageBubble({ message, isOwn, senderName }: Props) {
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = message.sender === "Me" ? "You" : senderName || message.sender;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className={`group flex flex-col ${isOwn ? "items-end" : "items-start"} py-1 px-1`}>
      {!isOwn && (
        <div className="mb-1 flex items-center gap-1.5 pl-1">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 ring-1 ring-white/10">
            {initial}
          </span>
          <span className="text-[11px] font-semibold text-slate-300">{displayName}</span>
        </div>
      )}

      <div className="relative flex items-center gap-1.5">
        {/* Action bar on hover (shown on left for own, right for others) */}
        {isOwn && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 mr-1">
            <button
              type="button"
              onClick={handleCopy}
              title="Copy message"
              className="rounded-lg bg-slate-900/80 p-1 text-[11px] text-slate-400 hover:text-white"
            >
              {copied ? "✓" : "📋"}
            </button>
            <button
              type="button"
              onClick={() => setReaction(reaction === "👍" ? null : "👍")}
              className="rounded-lg bg-slate-900/80 p-1 text-[11px] text-slate-400 hover:text-white"
            >
              👍
            </button>
          </div>
        )}

        <div
          className={`max-w-[82%] break-words rounded-2xl px-4 py-2.5 text-sm transition ${
            isOwn
              ? "theme-btn-primary text-white shadow-lg shadow-violet-500/10 font-normal"
              : "border border-white/5 bg-slate-900 text-slate-100 shadow-md shadow-slate-950/20"
          }`}
        >
          <div className="leading-relaxed whitespace-pre-wrap">{message.content}</div>
          <div
            className={`mt-1 text-right text-[10px] ${
              isOwn ? "text-white/80" : "text-slate-400"
            }`}
          >
            {formatTimeShort(message.timestamp)}
          </div>
        </div>

        {!isOwn && (
          <div className="opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 ml-1">
            <button
              type="button"
              onClick={() => setReaction(reaction === "❤️" ? null : "❤️")}
              className="rounded-lg bg-slate-900/80 p-1 text-[11px] text-slate-400 hover:text-white"
            >
              ❤️
            </button>
            <button
              type="button"
              onClick={handleCopy}
              title="Copy message"
              className="rounded-lg bg-slate-900/80 p-1 text-[11px] text-slate-400 hover:text-white"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        )}
      </div>

      {reaction && (
        <span className="mt-0.5 inline-flex items-center rounded-full border border-white/10 bg-slate-950/80 px-2 py-0.5 text-xs shadow">
          {reaction}
        </span>
      )}
    </div>
  );
}
