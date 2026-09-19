"use client";

import { useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message } from "@/data/mock-data";

type Props = {
  messages: Message[];
  currentUserName?: string;
  currentUserEmail?: string;
};

export default function MessageList({ messages, currentUserName, currentUserEmail }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const todayStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 custom-scrollbar">
      <div className="mx-auto max-w-4xl space-y-1">
        {/* Stitch Date Separator */}
        <div className="relative flex items-center justify-center my-3 select-none">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full bg-outline/10 h-px" />
          </div>
          <span className="relative px-3 py-0.5 rounded-full bg-surface-container font-mono text-[10px] text-on-surface-variant uppercase tracking-wider border border-outline/15 shadow-xs">
            Today • {todayStr}
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="py-12 text-center select-none">
            <div className="w-10 h-10 mx-auto rounded-full bg-surface-container flex items-center justify-center text-primary font-mono font-bold text-sm mb-2 border border-outline/15">
              #
            </div>
            <p className="text-xs font-semibold text-on-surface">Beginning of stream</p>
            <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
              No previous messages in this thread. Be the first to share an update!
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isOwn =
              m.sender === "Me" ||
              (Boolean(currentUserName) && m.sender.toLowerCase() === currentUserName?.toLowerCase()) ||
              (Boolean(currentUserEmail) && m.sender.toLowerCase() === currentUserEmail?.toLowerCase());

            return (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={Boolean(isOwn)}
                senderName={m.sender}
              />
            );
          })
        )}
        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
}
