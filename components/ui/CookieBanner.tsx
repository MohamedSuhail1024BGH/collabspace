"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "collabspace_cookie_consent_choice";

export function CookieBanner() {
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!consent) {
        // Small delay so it smoothly animates in after initial load
        const timer = setTimeout(() => setIsVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore if localStorage unavailable
    }
  }, []);

  const handleChoice = (accepted: boolean) => {
    try {
      localStorage.setItem(
        COOKIE_CONSENT_KEY,
        accepted ? "all_accepted" : "essential_only"
      );
      window.dispatchEvent(
        new CustomEvent("collabspace_analytics_consent", {
          detail: { analyticsAllowed: accepted },
        })
      );
    } catch {
      // Ignore
    }
    setIsVisible(false);
  };

  if (!mounted || !isVisible) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-50 p-4 sm:p-5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))",
      }}
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
          <Cookie className="size-4.5" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 id="cookie-banner-title" className="text-sm font-semibold text-foreground">
              Cookie Preferences
            </h3>
            <button
              type="button"
              onClick={() => handleChoice(false)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 rounded-lg"
              aria-label="Dismiss cookie notice with essential cookies only"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <p id="cookie-banner-desc" className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            We use essential cookies to maintain your workspace session and optional telemetry to improve team collaboration features. See our{" "}
            <Link href="/privacy" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
            .
          </p>

          <div className="mt-3.5 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => handleChoice(true)}
              className="h-8 px-3.5 text-xs font-semibold rounded-full shadow-xs"
            >
              Accept All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleChoice(false)}
              className="h-8 px-3.5 text-xs font-medium rounded-full"
            >
              Essential Only
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
