"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NOTICE_ACK_KEY = "collabspace_status_notice_ack";

const noticeItems = [
  {
    label: "Insecure",
    detail:
      "CollabSpace has not been security audited or penetration tested and may contain known vulnerabilities. Do not use it in production or with real sensitive data.",
  },
  {
    label: "Incomplete",
    detail:
      "Features are still being built and changed. Some flows are unfinished, unstable, or untested, and data may be reset without notice.",
  },
  {
    label: "Preview only",
    detail:
      "Enter demo or test information only. Anything you store here should be treated as public and disposable.",
  },
];

/**
 * Full-screen notice popup for the public entry pages (landing, login, signup).
 * Shown once per browser tab session; acknowledging it stores the consent in
 * sessionStorage so navigation between the three pages does not re-open it.
 */
export function StatusNoticeDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let acknowledged = false;
    try {
      acknowledged = sessionStorage.getItem(NOTICE_ACK_KEY) === "1";
    } catch {
      // sessionStorage unavailable (e.g. blocked cookies) — show the notice.
    }
    if (acknowledged) return;

    // Small delay so it animates in after the page has painted.
    const timer = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(NOTICE_ACK_KEY, "1");
    } catch {
      // Ignore — the notice will simply appear again next session.
    }
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setOpen(true);
        } else {
          dismiss();
        }
      }}
    >
      <DialogContent className="max-w-md gap-5 border-destructive/40">
        <DialogHeader className="gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20"
            aria-hidden="true"
          >
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-base sm:text-lg pr-6">
            This project is insecure and incomplete
          </DialogTitle>
          <DialogDescription className="leading-relaxed">
            Please read this notice before creating an account or entering any
            information on this site.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-3">
          {noticeItems.map((item) => (
            <li key={item.label} className="flex items-start gap-2.5">
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-foreground border border-border/80">
                {item.label}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {item.detail}
              </span>
            </li>
          ))}
        </ul>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" size="sm" asChild className="h-9 rounded-full px-4 text-xs font-medium">
            <Link href="/#status">Learn more</Link>
          </Button>
          <Button size="sm" onClick={dismiss} className="h-9 rounded-full px-4 text-xs font-semibold">
            I understand — continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
