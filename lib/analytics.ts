"use client";

// Client-side privacy-first analytics helper

export type AnalyticsEvent = {
  name: string;
  properties?: Record<string, string | number | boolean>;
};

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const choice = localStorage.getItem("collabspace_cookie_consent_choice");
    return choice === "all_accepted";
  } catch {
    return false;
  }
}

export function trackEvent(name: string, properties?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined") return;

  // Respect Do Not Track
  if (navigator.doNotTrack === "1") return;

  // Respect consent
  if (!hasAnalyticsConsent()) return;

  // Development logging
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.debug(`[Analytics Event] ${name}:`, properties);
  }

  // Push to dataLayer or custom telemetry endpoint if configured
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.dataLayer && Array.isArray(win.dataLayer)) {
      win.dataLayer.push({ event: name, ...properties });
    }
  } catch {
    // Ignore telemetry send errors
  }
}

export function trackPageView(url: string) {
  trackEvent("page_view", { path: url });
}
