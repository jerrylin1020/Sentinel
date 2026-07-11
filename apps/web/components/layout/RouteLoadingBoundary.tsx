"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export function RouteLoadingBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [destination, setDestination] = useState<string | null>(null);

  useEffect(() => {
    setDestination(null);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!destination) return;
    const timeout = window.setTimeout(() => setDestination(null), 10_000);
    return () => window.clearTimeout(timeout);
  }, [destination]);

  function startRouteLoading(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
    if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const url = new URL(anchor.href, window.location.href);
    const current = `${window.location.pathname}${window.location.search}`;
    const next = `${url.pathname}${url.search}`;
    if (url.origin === window.location.origin && next !== current) setDestination(next);
  }

  return (
    <div className="route-loading-boundary" onClickCapture={startRouteLoading}>
      {destination && (
        <div className="route-loading" role="status" aria-live="polite">
          <div className="route-loading-bar" />
          <div className="route-loading-label"><span className="loading-orbit" aria-hidden="true" />正在載入頁面…</div>
        </div>
      )}
      {children}
    </div>
  );
}
