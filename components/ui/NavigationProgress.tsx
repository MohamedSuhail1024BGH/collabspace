"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationProgressBarInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Turn off loading once the route/query changes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  // Turn off after safety timeout in case navigation was cancelled or handled in-page
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      // Ignore clicks with modifier keys (new tab, new window, etc.)
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.defaultPrevented) {
        return;
      }

      // Check if clicked element or parent is an anchor tag
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      // Don't trigger for external links, target="_blank", or download links
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href) return;

      // Ignore non-internal links and anchor hashes
      if (
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("//") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#") ||
        href === ""
      ) {
        return;
      }

      // Ignore if clicking the exact current URL
      const currentRelativeUrl = window.location.pathname + window.location.search;
      if (href === currentRelativeUrl || href === window.location.pathname) {
        return;
      }

      setIsLoading(true);
    };

    // Also support form submit events for instant feedback
    const handleFormSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (!form || form.target === "_blank") return;
      setIsLoading(true);
    };

    // Global custom event listeners so any button or action can trigger the loader imperatively
    const handleStartLoading = () => setIsLoading(true);
    const handleStopLoading = () => setIsLoading(false);

    document.addEventListener("click", handleDocumentClick, { capture: true });
    document.addEventListener("submit", handleFormSubmit, { capture: true });
    window.addEventListener("collabspace_start_loading", handleStartLoading);
    window.addEventListener("collabspace_stop_loading", handleStopLoading);

    return () => {
      document.removeEventListener("click", handleDocumentClick, { capture: true });
      document.removeEventListener("submit", handleFormSubmit, { capture: true });
      window.removeEventListener("collabspace_start_loading", handleStartLoading);
      window.removeEventListener("collabspace_stop_loading", handleStopLoading);
    };
  }, []);

  if (!isLoading) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page transition loading"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none h-[3px] bg-black/20 dark:bg-black/40 overflow-hidden"
    >
      <div className="h-full bg-[rgb(107,27,255)] shadow-[0_0_12px_rgba(107,27,255,0.9)] animate-nav-progress" />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressBarInner />
    </Suspense>
  );
}

export default NavigationProgress;

