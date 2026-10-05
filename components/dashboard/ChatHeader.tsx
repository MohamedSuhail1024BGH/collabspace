"use client";

import type { Conversation } from "@/data/mock-data";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Hash, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="h-14 px-3 sm:px-4 flex items-center justify-between border-b border-border/80 bg-card/60 backdrop-blur-md flex-shrink-0 select-none">
      {/* Left: Back button (mobile) + Identity stack */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="md:hidden size-8 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
            title="Back to conversation list"
            aria-label="Back to conversation list"
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}

        <div className="relative shrink-0">
          {isChannel ? (
            <div className="flex size-9 items-center justify-center rounded-xl bg-secondary/80 border border-border/80 text-foreground font-bold shadow-xs">
              <Hash className="size-4" />
            </div>
          ) : (
            <UserAvatar
              avatar={conversation.avatar}
              name={conversation.name}
              size="md"
              showStatus={true}
              statusColor={conversation.online ? "bg-emerald-500" : "bg-muted-foreground/40"}
            />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <h2 className="font-bold text-xs sm:text-sm text-foreground truncate leading-tight">
            {conversation.name}
          </h2>

          {isChannel ? (
            <p className="text-[11px] text-muted-foreground truncate font-mono">
              {memberCount
                ? `${memberCount} member${memberCount === 1 ? "" : "s"}`
                : "Workspace channel"}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={cn(
                  "inline-block size-1.5 rounded-full shrink-0",
                  conversation.online ? "bg-emerald-500" : "bg-muted-foreground/40"
                )}
              />
              <span
                className={cn(
                  "text-[11px] font-mono truncate",
                  conversation.online
                    ? "text-emerald-500 font-medium"
                    : "text-muted-foreground"
                )}
              >
                {conversation.online ? "Online" : "Offline"}
              </span>
              {conversation.role && (
                <>
                  <span className="text-border text-[10px]">•</span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {conversation.role}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Presence Indicator */}
      {isChannel && memberCount !== undefined && memberCount > 0 && (
        <Badge
          variant="secondary"
          title={`${memberCount} members in channel`}
          className="gap-1.5 px-2.5 py-1 text-xs font-mono"
        >
          <Users className="size-3.5 text-muted-foreground" />
          <span>{memberCount}</span>
        </Badge>
      )}
    </div>
  );
}
