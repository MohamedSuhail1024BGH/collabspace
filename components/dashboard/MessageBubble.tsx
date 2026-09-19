"use client";

import { useState } from "react";
import type { Message } from "@/data/mock-data";
import { formatTimeShort } from "@/lib/format-time";
import { UserAvatar } from "@/components/ui/UserAvatar";

type Props = {
  message: Message;
  isOwn: boolean;
  senderName?: string;
  senderAvatar?: string;
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
        <div className="relative max-w-[88%] sm:max-w-[72%] md:max-w-[65%] rounded-2xl rounded-tr-xs bg-primary/20 text-on-surface border border-primary/30 px-3.5 py-2 shadow-xs transition-colors">
          {/* Message Text or Code Block */}
          {isCode ? (
            <div className="my-1 rounded bg-surface-container-lowest/90 border border-outline/15 p-2 font-mono text-xs text-on-surface overflow-x-auto shadow-xs">
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                <code>{message.content.replace(/```/g, "")}</code>
              </pre>
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words font-body-md">
              {message.content}
            </div>
          )}

          {/* Telegram Outgoing Status Stack: Time + Double Checkmarks */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-mono text-primary/80 select-none">
            <span>{formatTimeShort(message.timestamp)}</span>
            <span className="inline-flex items-center text-secondary ml-0.5" title="Delivered & Read">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M2 12l5 5L18 6M7 12l5 5L22 6" />
              </svg>
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
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors shadow-xs ${
                        active
                          ? "bg-primary/30 text-primary border border-primary/40 font-bold"
                          : "bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline/10"
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="text-[10px]">{count}</span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Hover Action Bar (Copy & Quick Emoji Reactions) */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 right-2 flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-container border border-outline/20 shadow-md z-10">
            <button
              type="button"
              onClick={() => toggleReaction("👍")}
              title="React with 👍"
              className="p-1 rounded hover:bg-surface-container-high text-xs transition-colors"
            >
              👍
            </button>
            <button
              type="button"
              onClick={() => toggleReaction("🚀")}
              title="React with 🚀"
              className="p-1 rounded hover:bg-surface-container-high text-xs transition-colors"
            >
              🚀
            </button>
            <button
              type="button"
              onClick={() => toggleReaction("🔥")}
              title="React with 🔥"
              className="p-1 rounded hover:bg-surface-container-high text-xs transition-colors"
            >
              🔥
            </button>
            <div className="h-3 w-px bg-outline/20 mx-0.5" />
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy message"}
              className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs transition-colors flex items-center justify-center"
            >
              {copied ? (
                <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
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

      <div className="relative flex-1 rounded-2xl rounded-tl-xs bg-surface-container-high border border-outline/15 text-on-surface px-3.5 py-2 shadow-xs transition-colors">
        {/* Sender Name */}
        <div className="font-semibold text-xs text-primary mb-1 cursor-pointer hover:underline">
          {displayName}
        </div>

        {/* Message Text or Code Block */}
        {isCode ? (
          <div className="my-1 rounded bg-surface-container-lowest border border-outline/15 p-2 font-mono text-xs text-on-surface overflow-x-auto shadow-xs">
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
              <code>{message.content.replace(/```/g, "")}</code>
            </pre>
          </div>
        ) : (
          <div className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words font-body-md">
            {message.content}
          </div>
        )}

        {/* Telegram Incoming Status Stack: Time */}
        <div className="flex items-center justify-end mt-1 text-[10px] font-mono text-on-surface-variant/70 select-none">
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
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono transition-colors shadow-xs ${
                      active
                        ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                        : "bg-surface-container hover:bg-surface-container-highest text-on-surface border border-outline/10"
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-[10px]">{count}</span>
                  </button>
                );
              })}
          </div>
        )}

        {/* Hover Action Bar (Copy & Quick Emoji Reactions) */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-3.5 right-2 flex items-center gap-0.5 p-0.5 rounded-lg bg-surface-container border border-outline/20 shadow-md z-10">
          <button
            type="button"
            onClick={() => toggleReaction("👍")}
            title="React with 👍"
            className="p-1 rounded hover:bg-surface-container-high text-xs transition-colors"
          >
            👍
          </button>
          <button
            type="button"
            onClick={() => toggleReaction("🚀")}
            title="React with 🚀"
            className="p-1 rounded hover:bg-surface-container-high text-xs transition-colors"
          >
            🚀
          </button>
          <button
            type="button"
            onClick={() => toggleReaction("🔥")}
            title="React with 🔥"
            className="p-1 rounded hover:bg-surface-container-high text-xs transition-colors"
          >
            🔥
          </button>
          <div className="h-3 w-px bg-outline/20 mx-0.5" />
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy message"}
            className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs transition-colors flex items-center justify-center"
          >
            {copied ? (
              <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
