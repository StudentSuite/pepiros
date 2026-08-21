"use client";

import { useEffect, useState } from "react";

/**
 * Fixed top banner when the browser goes offline (docs/PLAN-V1.md §14.5).
 * Visual awareness only -- this app has no service worker / offline cache
 * layer, so "cached reads, queued writes" from the spec isn't implemented;
 * this doesn't claim it is.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    setOffline(!navigator.onLine);
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="fixed inset-x-0 top-0 z-[70] bg-unsupported px-3 py-1.5 text-center font-sans text-xs text-surface-sunken"
    >
      {/* Issue #277: components/site/SiteHeader.tsx offsets itself below this
          banner assuming a fixed, effectively-constant single-line height --
          without truncate, this copy (~60 chars) wraps to two lines on
          narrow phones (<=~380px), making the banner ~2x taller than the
          header assumes and breaking that offset on exactly the viewport
          class most likely to see a real connectivity drop. `title` keeps
          the full message available on hover/long-press even where it's
          visually clipped. */}
      <p className="truncate" title="You're offline. Changes won't save until you're back online.">
        You&apos;re offline. Changes won&apos;t save until you&apos;re back online.
      </p>
    </div>
  );
}
