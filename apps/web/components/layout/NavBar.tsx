"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Dashboard" },
  { href: "/signals", label: "Signals" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/detail/NVDA", label: "Detail" },
  { href: "/rules", label: "Rules" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 flex items-center gap-6 border-b border-border bg-panel px-4 py-2">
      <div className="flex items-center gap-2">
        <span className="pulse-dot" aria-hidden />
        <span className="mono text-sm font-bold tracking-widest text-text">SENTINEL</span>
      </div>
      <nav className="flex items-center gap-1">
        {tabs.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href.split("/").slice(0, 2).join("/"));
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                active ? "bg-panel-3 text-text" : "text-text-dim hover:bg-panel-2 hover:text-text"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3 text-xs text-text-dim">
        <span className="mono">Last scan 21:04:32</span>
        <button className="rounded border border-border-light px-2 py-1 hover:bg-panel-2">↻</button>
        <button className="rounded border border-border-light px-2 py-1 hover:bg-panel-2">EN / 繁中</button>
      </div>
    </header>
  );
}
