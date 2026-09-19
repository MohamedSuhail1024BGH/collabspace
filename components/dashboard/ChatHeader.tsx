"use client";

import { useState } from "react";
import type { Conversation } from "@/data/mock-data";
import { UserAvatar } from "@/components/ui/UserAvatar";

type Props = {
  conversation: Conversation;
  onBack?: () => void;
  memberCount?: number;
};

export default function ChatHeader({ conversation, onBack, memberCount = 8 }: Props) {
  const [isHuddleActive, setIsHuddleActive] = useState(false);
  const [showPinnedToast, setShowPinnedToast] = useState(false);

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
            className="p-1.5 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors md:hidden shrink-0"
            title="Back to conversation list"
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
              ? `${memberCount} members • Architecture & updates`
              : conversation.online
              ? "online"
              : conversation.role || "offline"}
          </p>
        </div>
      </div>

      {/* Right: Stitch precision engineering header actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Voice Huddle Action */}
        <button
          type="button"
          onClick={() => setIsHuddleActive(!isHuddleActive)}
          title={isHuddleActive ? "Leave Voice Huddle" : "Start Voice Huddle"}
          className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors shadow-xs ${
            isHuddleActive
              ? "bg-secondary text-on-secondary font-bold"
              : "bg-surface-container-high hover:bg-surface-container-highest text-secondary"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
          </svg>
          <span className="hidden sm:inline">{isHuddleActive ? "In Huddle" : "Huddle"}</span>
        </button>

        {/* Pinned Items Drawer Trigger */}
        <button
          type="button"
          onClick={() => {
            setShowPinnedToast(true);
            setTimeout(() => setShowPinnedToast(false), 2500);
          }}
          title="Pinned announcements & files"
          className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors text-xs font-mono"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="text-[10px] font-mono text-on-surface font-semibold">3</span>
        </button>

        {/* Member Presence Indicator */}
        <div
          title={isChannel ? `${memberCount} members present` : conversation.online ? "Online" : "Offline"}
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-surface-container-high text-on-surface-variant text-xs font-mono"
        >
          <svg className="h-3.5 w-3.5 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-[11px]">{isChannel ? memberCount : conversation.online ? "1" : "0"}</span>
        </div>
      </div>

      {/* Floating Pinned Feedback Toast */}
      {showPinnedToast && (
        <div className="absolute top-16 right-4 z-50 inline-flex items-center gap-1.5 rounded bg-surface-container-highest border border-outline/20 px-3 py-1.5 text-xs font-mono text-on-surface shadow-2xl animate-in fade-in duration-150">
          <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span>3 pinned threads & architectural docs in this channel</span>
        </div>
      )}
    </div>
  );
}
