"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export type UserAvatarProps = {
  avatar?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  statusColor?: string;
};

const sizeClasses: Record<string, { box: string; text: string; icon: string; dot: string }> = {
  xs: { box: "size-5", text: "text-[9px]", icon: "size-3", dot: "size-1.5" },
  sm: { box: "size-7", text: "text-xs", icon: "size-3.5", dot: "size-2" },
  md: { box: "size-9", text: "text-sm", icon: "size-4", dot: "size-2.5" },
  lg: { box: "size-11", text: "text-base", icon: "size-5", dot: "size-3" },
  xl: { box: "size-14", text: "text-lg", icon: "size-6", dot: "size-3.5" },
};

export function UserAvatar({
  avatar,
  name,
  size = "sm",
  className = "",
  showStatus = false,
  statusColor = "bg-emerald-500",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const isImageUrl =
    Boolean(avatar) &&
    !imageError &&
    (avatar!.startsWith("data:image/") ||
      avatar!.startsWith("http://") ||
      avatar!.startsWith("https://") ||
      avatar!.startsWith("/") ||
      avatar!.startsWith("blob:"));

  const sizeCfg = sizeClasses[size] || sizeClasses.sm;

  const getInitials = (n?: string | null) => {
    if (!n || !n.trim()) return "";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.trim().slice(0, 2).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <div className={cn("relative shrink-0 inline-flex items-center justify-center", sizeCfg.box, className)}>
      <Avatar className={cn(sizeCfg.box, "border border-border/60 shadow-xs")}>
        {isImageUrl && (
          <AvatarImage
            src={avatar!}
            alt={name || "User Avatar"}
            onError={() => setImageError(true)}
            className="object-cover"
          />
        )}
        <AvatarFallback className={cn("bg-primary text-primary-foreground font-semibold select-none", sizeCfg.text)}>
          {initials || <User className={sizeCfg.icon} />}
        </AvatarFallback>
      </Avatar>

      {showStatus && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card",
            sizeCfg.dot,
            statusColor
          )}
        />
      )}
    </div>
  );
}
