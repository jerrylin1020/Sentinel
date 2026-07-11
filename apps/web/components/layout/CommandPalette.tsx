"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Severity = "p1" | "p2" | "observe";

type SearchItem = {
  ticker: string;
  name: string;
  assetType: string;
  severity?: Severity;
  watched: boolean;
};

const SEVERITY_BADGE: Record<Severity, string> = {
  p1: "bg-p1/10 text-p1",
  p2: "bg-p2/10 text-p2",
  observe: "bg-panel-3 text-text-dim",
};

const SEVERITY_RANK: Record<Severity, number> = { p1: 0, p2: 1, observe: 2 };

// Global ticker search: press ⌘K (or click the trigger) to jump straight to
// a symbol's Detail page. Sourced from the user's watchlist plus tickers with
// active signals, since those are the only tickers with meaningful detail data.
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lazily load the searchable ticker list the first time the palette opens.
  useEffect(() => {
    if (!open || items !== null) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/backend/watchlist").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetch("/api/backend/signals").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]).then(([watchlist, signals]: [any[], any[]]) => {
      if (cancelled) return;
      const byTicker = new Map<string, SearchItem>();
      for (const w of watchlist) {
        byTicker.set(w.symbol.ticker, { ticker: w.symbol.ticker, name: w.symbol.name, assetType: w.symbol.asset_type, watched: true });
      }
      for (const s of signals) {
        const existing = byTicker.get(s.ticker);
        if (existing) {
          if (!existing.severity || SEVERITY_RANK[s.severity as Severity] < SEVERITY_RANK[existing.severity]) existing.severity = s.severity;
        } else {
          byTicker.set(s.ticker, { ticker: s.ticker, name: s.name, assetType: s.asset_type, severity: s.severity, watched: false });
        }
      }
      setItems(Array.from(byTicker.values()));
    });
    return () => { cancelled = true; };
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const results = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toUpperCase();
    if (!q) return items.slice(0, 20);
    return items
      .map((it) => ({ it, rank: matchRank(it, q) }))
      .filter((x): x is { it: SearchItem; rank: number } => x.rank !== null)
      .sort((a, b) => a.rank - b.rank || a.it.ticker.localeCompare(b.it.ticker))
      .slice(0, 20)
      .map((x) => x.it);
  }, [items, query]);

  function go(ticker: string) {
    setOpen(false);
    router.push(`/detail/${ticker}`);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); go(results[activeIndex].ticker); }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rail-extra mx-1 flex items-center gap-2 rounded-md border border-border bg-panel px-2.5 py-2 text-xs text-text-dim transition-colors hover:border-border-light">
        <SearchIcon /><span>搜尋或指令…</span><kbd className="ml-auto rounded border border-border bg-panel-2 px-1 py-0.5 font-mono text-[10px] text-text-faint">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-bg/80 p-4 pt-[12vh] backdrop-blur-sm" role="presentation" onClick={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="搜尋標的" className="w-full max-w-lg overflow-hidden rounded-xl border border-border-light bg-panel shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
                onKeyDown={onInputKeyDown}
                placeholder="搜尋股票代碼或名稱…（例如 NVDA、BTCUSDT）"
                className="flex-1 bg-transparent text-sm text-text placeholder:text-text-faint focus:outline-none"
              />
              <kbd className="rounded border border-border bg-panel-2 px-1 py-0.5 font-mono text-[10px] text-text-faint">Esc</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {items === null ? (
                <p className="px-4 py-6 text-center text-sm text-text-faint">載入中…</p>
              ) : results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-text-faint">找不到符合「{query}」的標的</p>
              ) : (
                results.map((it, i) => (
                  <button
                    key={it.ticker}
                    type="button"
                    onClick={() => go(it.ticker)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === activeIndex ? "bg-panel-2" : ""}`}
                  >
                    <span className="font-mono text-sm font-bold text-text">{it.ticker}</span>
                    <span className="min-w-0 flex-1 truncate text-xs text-text-dim">{it.name}</span>
                    {it.severity && <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_BADGE[it.severity]}`}>{it.severity.toUpperCase()}</span>}
                    {it.watched && <span className="text-[10px] text-text-faint">已追蹤</span>}
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function matchRank(it: SearchItem, q: string): number | null {
  const ticker = it.ticker.toUpperCase();
  const name = it.name.toUpperCase();
  if (ticker === q) return 0;
  if (ticker.startsWith(q)) return 1;
  if (ticker.includes(q)) return 2;
  if (name.includes(q)) return 3;
  return null;
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
}
