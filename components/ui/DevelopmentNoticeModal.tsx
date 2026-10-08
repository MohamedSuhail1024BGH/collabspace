"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const NOTICE_STORAGE_KEY = "collabspace_dev_notice_acknowledged";

export function DevelopmentNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const acknowledged = localStorage.getItem(NOTICE_STORAGE_KEY);
      if (!acknowledged) {
        // Small delay to allow the main page to mount before presenting the dialog
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch {
      setIsOpen(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(NOTICE_STORAGE_KEY, "true");
    } catch {
      // Ignore if storage is inaccessible
    }
    setIsOpen(false);
  }, []);

  // Keyboard accessibility: Escape to dismiss & focus trap management
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleDismiss();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      const timer = setTimeout(() => {
        primaryButtonRef.current?.focus();
      }, 50);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        clearTimeout(timer);
      };
    }
  }, [isOpen, handleDismiss]);

  if (!mounted || !isOpen) {
    return null;
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-notice-title"
        aria-describedby="dev-notice-desc"
        className="relative w-full max-w-lg rounded-2xl border border-amber-500/40 bg-[#161618] text-[#f4f4f5] p-5 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-200 focus-visible:outline-none"
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 p-2 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
          aria-label="Close development notice"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium tracking-wide bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-1.5">
              <span>WORK IN PROGRESS</span>
            </div>
            <h2 id="dev-notice-title" className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Project Under Active Development
            </h2>
          </div>
        </div>

        {/* Content Body */}
        <div id="dev-notice-desc" className="mt-4 space-y-3 text-xs sm:text-sm text-[#d4d4d8] leading-relaxed">
          <p>
            Welcome to <strong className="text-white font-semibold">CollabSpace</strong>. This platform is an early prototype currently in active development.
          </p>

          <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs sm:text-sm">
              <ShieldAlert className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
              <span>Security &amp; Usage Advisory</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              This environment is <strong>not yet hardened for production</strong> and may contain experimental features. Please do not store sensitive passwords, confidential customer data, or critical secrets.
            </p>
          </div>

          <ul className="space-y-1.5 text-xs text-[#a1a1aa] list-disc list-inside">
            <li>Ongoing security hardening &amp; verification in progress</li>
            <li>Real-time sync and data schemas may undergo breaking updates</li>
            <li>New features and interface enhancements are being deployed frequently</li>
          </ul>
        </div>

        {/* Action Buttons (Responsive: full width on mobile, right-aligned on desktop) */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-2 border-t border-[#27272a]">
          <Button
            ref={primaryButtonRef}
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto h-10 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs sm:text-sm transition-all shadow-sm active:scale-98 focus-visible:ring-2 focus-visible:ring-amber-300"
          >
            <CheckCircle2 className="size-4 mr-1.5" aria-hidden="true" />
            I Understand &amp; Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
