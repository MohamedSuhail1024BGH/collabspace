"use client";

import type { Conversation } from "@/data/mock-data";
import { UserAvatar } from "@/components/ui/UserAvatar";

type Props = {
  conversation: Conversation;
  onBack?: () => void;
  memberCount?: number;
};

export default function ChatHeader({ conversation, onBack, memberCount }: Props) {
  const isChannel =
    conversation.type === "channel" ||
    (conversation.type !== "direct" &&
      (conversation.id.startsWith("conv-design") ||
        conversation.id.startsWith("conv-product") ||
        conversation.id.startsWith("conv-eng") ||
        conversation.id.startsWith("conv-ops") ||
        conversation.name.startsWith("#")));

  return (
    <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-outline/15 bg-surface-container flex-shrink-0 select-none">
      {/* Left: Back button (mobile) + Identity stack */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors md:hidden shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95 cursor-pointer"
            title="Back to conversation list"
            aria-label="Back to conversation list"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        <div className="relative shrink-0">
          {isChannel ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary font-mono text-sm font-bold shadow-xs">
              #
            </div>
          ) : (
            <UserAvatar
              avatar={conversation.avatar}
              name={conversation.name}
              size="md"
              showStatus={conversation.online}
              statusColor={conversation.online ? "bg-secondary" : "bg-outline/50"}
            />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h2 className="font-bold text-xs sm:text-sm text-on-surface truncate font-headline-md leading-tight">
            {conversation.name}
          </h2>

          <p className="text-[11px] font-mono text-on-surface-variant truncate">
            {isChannel
              ? memberCount
                ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                : "Workspace channel"
              : conversation.online
              ? "Online"
              : conversation.role || "Offline"}
          </p>
        </div>
      </div>

      {/* Right: Presence Indicator */}
      {isChannel && memberCount !== undefined && memberCount > 0 && (
        <div
          title={`${memberCount} members in channel`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant text-xs font-mono"
        >
          <svg className="h-3.5 w-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[11px] font-semibold text-on-surface">{memberCount}</span>
        </div>
      )}
    </div>
  );
}
