"use client";

import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

export type WorkspaceAvatarProps = {
  avatar?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  fallbackClassName?: string;
};

const sizeClasses: Record<string, { box: string; text: string; icon: string; rounded: string }> = {
  xs: { box: "size-5 sm:size-5.5", text: "text-[9px] sm:text-[10px]", icon: "size-3", rounded: "rounded-md" },
  sm: { box: "size-7 sm:size-8", text: "text-xs", icon: "size-3.5 sm:size-4", rounded: "rounded-lg" },
  md: { box: "size-9 sm:size-10", text: "text-sm", icon: "size-4 sm:size-4.5", rounded: "rounded-lg" },
  lg: { box: "size-11 sm:size-12", text: "text-base sm:text-lg", icon: "size-5 sm:size-6", rounded: "rounded-xl" },
  xl: { box: "size-16 sm:size-20", text: "text-xl sm:text-2xl", icon: "size-8 sm:size-10", rounded: "rounded-2xl" },
  "2xl": { box: "size-20 sm:size-24", text: "text-2xl sm:text-3xl", icon: "size-10 sm:size-12", rounded: "rounded-2xl" },
};

export function WorkspaceAvatar({
  avatar,
  name,
  size = "sm",
  className = "",
  fallbackClassName = "",
}: WorkspaceAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [prevAvatar, setPrevAvatar] = useState(avatar);

  if (avatar !== prevAvatar) {
    setPrevAvatar(avatar);
    setImageError(false);
  }

  const cleanAvatar = avatar?.trim() || null;
  const isGradient = Boolean(cleanAvatar && (cleanAvatar.includes("from-") || cleanAvatar.startsWith("bg-")));
  const isImageUrl =
    Boolean(cleanAvatar) &&
    !imageError &&
    !isGradient &&
    (cleanAvatar!.startsWith("data:image/") ||
      cleanAvatar!.startsWith("http://") ||
      cleanAvatar!.startsWith("https://") ||
      cleanAvatar!.startsWith("/") ||
      cleanAvatar!.startsWith("blob:"));

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
    <div
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center overflow-hidden select-none",
        sizeCfg.box,
        sizeCfg.rounded,
        className
      )}
      aria-label={name ? `${name} workspace` : "Workspace"}
    >
      <Avatar className={cn(sizeCfg.box, sizeCfg.rounded, "border border-border/70 shadow-xs")}>
        {isImageUrl && (
          <AvatarImage
            src={cleanAvatar!}
            alt={name ? `${name} workspace picture` : "Workspace picture"}
            onError={() => setImageError(true)}
            className="object-cover w-full h-full"
          />
        )}
        <AvatarFallback
          className={cn(
            isGradient
              ? cn("bg-gradient-to-br text-white font-bold", cleanAvatar)
              : "bg-secondary text-foreground font-bold",
            "select-none",
            sizeCfg.rounded,
            sizeCfg.text,
            fallbackClassName
          )}
        >
          {initials || <Building2 className={sizeCfg.icon} aria-hidden="true" />}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
