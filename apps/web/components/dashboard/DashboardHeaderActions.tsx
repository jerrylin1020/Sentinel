"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

// Matches the `revalidate: 30` fetch cache window used by getSignals()/getWatchlist()
// in lib/api.ts, so we're never refreshing more often than the data can actually change.
const AUTO_REFRESH_MS = 30_000;

export function DashboardHeaderActions() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Skip refreshing while the tab isn't visible to avoid wasted work.
      if (document.visibilityState === "visible") {
        startRefresh(() => router.refresh());
      }
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <button
      type="button"
      className="toolbar-button"
      onClick={() => startRefresh(() => router.refresh())}
      disabled={isRefreshing}
    >
      {isRefreshing ? "重掃中…" : "↻ 重掃"}
    </button>
  );
}
