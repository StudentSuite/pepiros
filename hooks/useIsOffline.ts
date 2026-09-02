"use client";

import { useEffect, useState } from "react";

/**
 * Issue #372: components/ui/OfflineBanner.tsx docks `fixed inset-x-0 top-0
 * z-[70]`, above any sticky header's own z-index, and doesn't expose its
 * visibility to consumers -- a sticky header that doesn't independently
 * track online/offline state renders underneath the banner instead of
 * beside it. SiteHeader.tsx used to do this tracking inline (duplicated,
 * and only there); this hook is the shared version so every sticky header
 * can offset itself the same way, not just the one that happened to get it
 * first.
 */
export function useIsOffline(): boolean {
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

  return offline;
}
