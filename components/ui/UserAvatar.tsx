"use client";

import { useState } from "react";

export type UserAvatarProps = {
  avatar?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showStatus?: boolean;
  statusColor?: string;
};

const sizeClasses: Record<string, { box: string; text: string; icon: string; dot: string }> = {
  xs: { box: "w-5 h-5", text: "text-[9px]", icon: "w-3 h-3", dot: "w-1.5 h-1.5" },
  sm: { box: "w-7 h-7", text: "text-xs", icon: "w-3.5 h-3.5", dot: "w-2 h-2" },
  md: { box: "w-9 h-9", text: "text-sm", icon: "w-4 h-4", dot: "w-2.5 h-2.5" },
  lg: { box: "w-11 h-11", text: "text-base", icon: "w-5 h-5", dot: "w-3 h-3" },
  xl: { box: "w-14 h-14", text: "text-lg", icon: "w-6 h-6", dot: "w-3.5 h-3.5" },
};

export function UserAvatar({
  avatar,
  name,
  size = "sm",
  className = "",
  showStatus = false,
  statusColor = "bg-secondary",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Check if avatar is an image URL or data URI
  const isImageUrl =
    Boolean(avatar) &&
    !imageError &&
    (avatar!.startsWith("data:image/") ||
      avatar!.startsWith("http://") ||
      avatar!.startsWith("https://") ||
      avatar!.startsWith("/") ||
      avatar!.startsWith("blob:"));

  const sizeCfg = sizeClasses[size] || sizeClasses.sm;

  // Extract monogram letters or fallback initials
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
    <div className={`relative shrink-0 inline-flex items-center justify-center ${sizeCfg.box} ${className}`}>
      {isImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar!}
          alt={name || "User Avatar"}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded border border-outline/20 shadow-xs"
        />
      ) : initials ? (
        <div
          className={`w-full h-full rounded flex items-center justify-center font-mono font-bold text-on-primary bg-primary border border-primary/40 shadow-xs select-none ${sizeCfg.text}`}
        >
          {initials}
        </div>
      ) : (
        <div
          className={`w-full h-full rounded flex items-center justify-center bg-surface-container-highest text-on-surface-variant border border-outline/20 shadow-xs select-none ${sizeCfg.text}`}
        >
          <svg className={sizeCfg.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-1 ring-surface-container-lowest ${sizeCfg.dot} ${statusColor}`}
        />
      )}
    </div>
  );
}

