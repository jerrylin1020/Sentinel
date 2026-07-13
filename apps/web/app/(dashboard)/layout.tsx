import { NavBar } from "@/components/layout/NavBar";
import { RouteLoadingBoundary } from "@/components/layout/RouteLoadingBoundary";
import { getSignals, getWatchlist } from "@/lib/api";
import { Suspense } from "react";

function taipeiDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const today = taipeiDate();
  const [recentSignals, watchlist, p1Today] = await Promise.all([
    getSignals(undefined, { signalDate: today, days: 5, limit: 2_000 }),
    getWatchlist(),
    getSignals("p1", { signalDate: today, limit: 2_000 }),
  ]);
  const counts = { signals: recentSignals.length, watchlist: watchlist.length, p1Today: p1Today.length };

  return (
    <Suspense fallback={<div className="app-shell"><NavBar /><main className="app-main">{children}</main></div>}>
      <RouteLoadingBoundary>
        <div className="app-shell">
          <NavBar counts={counts} />
          <main className="app-main">{children}</main>
        </div>
      </RouteLoadingBoundary>
    </Suspense>
  );
}
