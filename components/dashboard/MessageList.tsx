"use client";

import MessageBubble from "./MessageBubble";
import type { Message } from "@/data/mock-data";

type Props = {
  messages: Message[];
};

export default function MessageList({ messages }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-2 py-4">
      <div className="mx-auto max-w-3xl space-y-2">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} isOwn={m.sender === "Me"} />
        ))}
        <div className="h-6" />
      </div>
    </div>
  );
}
