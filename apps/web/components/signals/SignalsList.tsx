"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ApiSignal } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";
import { fmtDateTime } from "@/lib/format";

const taipeiDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function taipeiCalendarDay(value: string | Date) {
  const parts = taipeiDateFormatter.formatToParts(new Date(value));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day")) / 86_400_000;
}

function relativeDay(triggeredAt: string) {
  const daysAgo = taipeiCalendarDay(new Date()) - taipeiCalendarDay(triggeredAt);
  if (daysAgo <= 0) return { label: "今天", style: "border-cyan/40 bg-cyan/15 text-cyan" };
  if (daysAgo === 1) return { label: "昨天", style: "border-amber/35 bg-amber/10 text-amber" };
  return { label: `${daysAgo} 天前`, style: "border-border-light bg-panel-3 text-text-dim" };
}

export function SignalsList({ signals }: { signals: ApiSignal[] }) {
  const [tickerFilter, setTickerFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState<"all" | "equity" | "crypto">("all");
  const visibleSignals = useMemo(() => {
    const query = tickerFilter.trim().toUpperCase();
    return signals.filter((signal) =>
      signal.ticker.toUpperCase().includes(query)
      && (assetFilter === "all" || signal.asset_type === assetFilter),
    );
  }, [assetFilter, signals, tickerFilter]);

  return <div>
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2.5">
      <label htmlFor="signals-filter" className="sr-only">篩選代碼</label>
      <input
        id="signals-filter"
        value={tickerFilter}
        onChange={(event) => setTickerFilter(event.target.value.toUpperCase())}
        placeholder="⌕ 篩選代碼，例如 WLD"
        className="w-52 rounded-md border border-border-light bg-bg px-2.5 py-1.5 text-sm placeholder:text-text-faint"
      />
      <span className="font-mono text-xs text-text-dim">{visibleSignals.length} / {signals.length} 則</span>
      <span className="hidden h-5 border-l border-border sm:block" />
      <span className="text-xs text-text-dim">只顯示</span>
      {(["all", "equity", "crypto"] as const).map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => setAssetFilter(type)}
          className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${assetFilter === type ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-transparent text-text-dim hover:border-border-light hover:bg-panel-2"}`}
        >
          {type === "all" ? "全部" : type === "equity" ? "Stock" : "Crypto"}
        </button>
      ))}
    </div>
    {visibleSignals.length ? <div>{visibleSignals.map((s) => {
      const age = relativeDay(s.triggered_at);
      return <Link key={s.id} href={`/detail/${s.ticker}#signal-${s.id}`} className="signal-row grid gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-panel sm:grid-cols-[112px_66px_88px_minmax(0,1fr)_64px] sm:items-center"><time className="font-mono"><span className={`inline-flex rounded border px-2 py-0.5 text-xs font-semibold ${age.style}`}>{age.label}</span><span className="mt-1 block whitespace-nowrap text-[10px] text-text-faint">{fmtDateTime(s.triggered_at)}</span></time><span className={`h-fit w-fit rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${severityColor[s.severity]}`}>{s.severity.toUpperCase()} · {s.score.toFixed(1)}</span><span><strong className="font-mono text-sm">{s.ticker}</strong><small className="ml-1 text-[11px] text-text-faint sm:ml-0 sm:block">{s.name}</small></span><span className="min-w-0 text-xs leading-5 text-text-dim"><strong className="font-medium text-cyan">{s.rules[0]?.name || "Signal"}</strong>{s.rules[0]?.detail ? ` · ${s.rules[0].detail}` : ""}</span><span className="font-mono text-right text-xs text-text">{s.price.toLocaleString()}</span></Link>;
    })}</div> : <p className="py-12 text-center text-sm text-text-dim">找不到符合的訊號，請調整篩選條件。</p>}
  </div>;
}
