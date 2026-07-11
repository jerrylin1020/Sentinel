import { NavBar } from "@/components/layout/NavBar";
import { RouteLoadingBoundary } from "@/components/layout/RouteLoadingBoundary";
import { Suspense } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="app-shell"><NavBar /><main className="app-main">{children}</main></div>}>
      <RouteLoadingBoundary>
        <div className="app-shell">
          <NavBar />
          <main className="app-main">{children}</main>
        </div>
      </RouteLoadingBoundary>
    </Suspense>
  );
}
