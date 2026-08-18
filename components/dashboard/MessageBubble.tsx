"use client";

import type { Message } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";

type Props = {
  message: Message;
  isOwn: boolean;
};

export default function MessageBubble({ message, isOwn }: Props) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} py-1`}> 
      <div className={`max-w-[78%] break-words rounded-2xl px-4 py-2 text-sm ${isOwn ? "bg-violet-500 text-white" : "bg-slate-800 text-slate-100"}`}>
        <div>{message.content}</div>
        <div className="mt-1 text-right text-[11px] text-slate-400">{formatTimeShort(message.timestamp)}</div>
      </div>
    </div>
  );
}
