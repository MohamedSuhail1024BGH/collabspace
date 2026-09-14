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

  return (
    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
      <div className="mx-auto max-w-3xl space-y-2">
        {messages.map((m) => {
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
        })}
        <div ref={bottomRef} className="h-2" />
      </div>
    </div>
  );
}
