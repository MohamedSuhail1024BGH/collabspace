"use client";

import { useState } from "react";
import type { Message } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Check, CheckCheck, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string | null;
};

export default function MessageBubble({ message, isOwn, senderName, senderAvatar }: Props) {
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState<{ [emoji: string]: number }>({});
  const [userReactions, setUserReactions] = useState<string[]>([]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleReaction = (emoji: string) => {
    if (userReactions.includes(emoji)) {
      setUserReactions((prev) => prev.filter((e) => e !== emoji));
      setReactions((prev) => ({
        ...prev,
        [emoji]: Math.max(0, (prev[emoji] || 1) - 1),
      }));
    } else {
      setUserReactions((prev) => [...prev, emoji]);
      setReactions((prev) => ({
        ...prev,
        [emoji]: (prev[emoji] || 0) + 1,
      }));
    }
  };

  const displayName = message.sender === "Me" ? "You" : senderName || message.sender;

  // Detect if message is a code snippet
  const isCode =
    message.content.includes("```") ||
    message.content.startsWith("SELECT") ||
    message.content.startsWith("const ") ||
    message.content.startsWith("function ");

  const hasReactions = Object.values(reactions).some((count) => count > 0);

  if (isOwn) {
    return (
      <div className="group relative flex justify-end w-full py-0.5">
        <div className="relative max-w-[88%] sm:max-w-[72%] md:max-w-[65%] rounded-2xl rounded-tr-xs bg-primary/15 text-foreground border border-primary/25 px-3.5 py-2 shadow-xs transition-colors">
          {/* Message Text or Code Block */}
          {isCode ? (
            <div className="my-1 rounded-lg bg-background/80 border border-border p-2 font-mono text-xs text-foreground overflow-x-auto shadow-xs">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                <code>{message.content.replace(/```/g, "")}</code>
              </pre>
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          )}

          {/* Outgoing Status: Time + Double Checkmarks */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-primary/80 select-none">
            <span>{formatTimeShort(message.timestamp)}</span>
            <span title="Delivered & Read">
              <CheckCheck className="size-3.5 text-emerald-500 ml-0.5" />
            </span>
          </div>

          {/* Reaction Chips */}
          {hasReactions && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {Object.entries(reactions)
                .filter(([, count]) => count > 0)
                .map(([emoji, count]) => {
                  const active = userReactions.includes(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => toggleReaction(emoji)}
                      className={cn(
                        "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors shadow-xs",
                        active
                          ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                          : "bg-secondary hover:bg-secondary/80 text-foreground border border-border"
                      )}
                    >
                      <span>{emoji}</span>
                      <span className="text-[10px]">{count}</span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Hover Action Bar */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 right-2 flex items-center gap-0.5 p-0.5 rounded-lg bg-card border border-border shadow-md z-10">
            <button
              type="button"
              onClick={() => toggleReaction("👍")}
              title="React with 👍"
              className="p-1 rounded hover:bg-secondary text-xs transition-colors"
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => toggleReaction("🚀")}
              title="React with 🚀"
              className="p-1 rounded hover:bg-secondary text-xs transition-colors"
            >
              🚀
            </button>
            <button
              type="button"
              onClick={() => toggleReaction("🔥")}
              title="React with 🔥"
              className="p-1 rounded hover:bg-secondary text-xs transition-colors"
            >
              🔥
            </button>
            <div className="h-3 w-px bg-border mx-0.5" />
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy message"}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors flex items-center justify-center"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex items-start gap-2.5 my-1 w-full max-w-[88%] sm:max-w-[72%] md:max-w-[65%]">
      {/* Sender Avatar */}
      <div className="shrink-0 mt-1">
        <UserAvatar avatar={senderAvatar} name={displayName} size="sm" />
      </div>

      <div className="relative flex-1 rounded-2xl rounded-tl-xs bg-secondary/60 border border-border text-foreground px-3.5 py-2 shadow-xs transition-colors">
        {/* Sender Name */}
        <div className="font-semibold text-xs text-primary mb-1 cursor-pointer hover:underline">
          {displayName}
        </div>

        {/* Message Text or Code Block */}
        {isCode ? (
          <div className="my-1 rounded-lg bg-background/80 border border-border p-2 font-mono text-xs text-foreground overflow-x-auto shadow-xs">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
              <code>{message.content.replace(/```/g, "")}</code>
            </pre>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
        )}

        {/* Time */}
        <div className="flex items-center justify-end mt-1 text-[10px] font-mono text-muted-foreground select-none">
          <span>{formatTimeShort(message.timestamp)}</span>
        </div>

        {/* Reaction Chips */}
        {hasReactions && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {Object.entries(reactions)
              .filter(([, count]) => count > 0)
              .map(([emoji, count]) => {
                const active = userReactions.includes(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => toggleReaction(emoji)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors shadow-xs",
                      active
                        ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                        : "bg-card hover:bg-secondary text-foreground border border-border"
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px]">{count}</span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Hover Action Bar */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 right-2 flex items-center gap-0.5 p-0.5 rounded-lg bg-card border border-border shadow-md z-10">
          <button
            type="button"
            onClick={() => toggleReaction("👍")}
            title="React with 👍"
            className="p-1 rounded hover:bg-secondary text-xs transition-colors"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => toggleReaction("🚀")}
            title="React with 🚀"
            className="p-1 rounded hover:bg-secondary text-xs transition-colors"
          >
            🚀
          </button>
          <button
            type="button"
            onClick={() => toggleReaction("🔥")}
            title="React with 🔥"
            className="p-1 rounded hover:bg-secondary text-xs transition-colors"
          >
            🔥
          </button>
          <div className="h-3 w-px bg-border mx-0.5" />
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy message"}
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground text-xs transition-colors flex items-center justify-center"
          >
            {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
