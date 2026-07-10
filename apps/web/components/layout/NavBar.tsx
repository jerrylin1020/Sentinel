"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Dashboard", icon: "grid" },
  { href: "/signals", label: "Signals", icon: "signal" },
  { href: "/watchlist", label: "Watchlist", icon: "eye" },
  { href: "/detail/NVDA", label: "Detail", icon: "chart" },
  { href: "/rules", label: "Rules", icon: "rules" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <aside className="app-rail flex border-b border-border bg-bg p-3 lg:flex-col lg:gap-5 lg:border-b-0 lg:border-r lg:px-3.5 lg:py-[18px]">
      <Link href="/" aria-label="回到 Dashboard" className="flex items-center gap-2.5 rounded-md px-2 lg:w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/70">
        <BrandMark />
        <span className="text-base font-bold tracking-tight text-text">Sentinel</span>
        <span className="ml-auto rounded bg-panel-2 px-1.5 py-0.5 font-mono text-[10px] text-text-faint">v0.2</span>
      </Link>
      <button className="rail-extra mx-1 flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-2 text-xs text-text-dim transition-colors hover:border-border-light">
        <SearchIcon /><span>搜尋或指令…</span><kbd className="ml-auto rounded border border-border bg-panel-2 px-1 py-0.5 font-mono text-[10px] text-text-faint">⌘K</kbd>
      </button>
      <nav className="rail-navigation min-w-0 lg:flex-1">
        <div className="lg:block">
          <p className="section-label mb-1 px-2.5 pt-2">Overview</p>
          {tabs.map((t) => {
            const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href.split("/").slice(0, 2).join("/"));
            return <Link key={t.href} href={t.href} className={`rail-link ${active ? "rail-link-active" : ""}`}>
              <NavIcon name={t.icon} /><span>{t.label}</span>{t.href === "/signals" && <span className="rail-count">12</span>}{t.href === "/watchlist" && <span className="rail-count">45</span>}
            </Link>;
          })}
          <div className="rail-extra">
            <p className="section-label mb-1 px-2.5 pt-5">Alerts</p>
            <Link href="/signals?severity=p1" className="rail-link"><BellIcon /><span>P1 today</span><span className="rail-count bg-p1/10 text-p1">P1</span></Link>
            <Link href="/signals?view=digest" className="rail-link"><CalendarIcon /><span>Digest</span></Link>
          </div>
        </div>
      </nav>
      <div className="rail-status rail-extra border-t border-border px-2.5 pt-3 text-[11px] text-text-dim">
        <div className="flex items-center gap-1.5 text-up"><span className="pulse-dot h-1.5 w-1.5" />Scanner live</div>
        <p className="mt-1.5 font-mono text-[10px] text-text-faint">Latest scan available</p>
      </div>
    </aside>
  );
}

function BrandMark() {
  return (
    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gradient-to-br from-cyan to-blue text-bg" aria-hidden="true">
      <svg width="19" height="19" viewBox="0 0 32 32" fill="none">
        <path d="M16 5a11 11 0 1 0 11 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 10a6 6 0 1 0 6 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M16 16 25 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <circle cx="25" cy="7" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

function NavIcon({ name }: { name: string }) { const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 }; if (name === "grid") return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>; if (name === "signal") return <svg {...common}><path d="M3 12h4l3-9 4 18 3-9h4"/></svg>; if (name === "eye") return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; if (name === "chart") return <svg {...common}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>; return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>; }
function BellIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>; }
function CalendarIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16"/></svg>; }
