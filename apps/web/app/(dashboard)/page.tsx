import Link from "next/link";
import { getSignals, getWatchlist } from "@/lib/api";
import { fmtHourMinute } from "@/lib/format";

export default async function DashboardPage() {
  const [signals, watchlist] = await Promise.all([getSignals(), getWatchlist()]);
  const watchedTickers = new Set(watchlist.map((item) => item.symbol.ticker));
  const activeSignals = signals.filter((signal) => watchedTickers.has(signal.ticker));
  const p1 = activeSignals.filter((s) => s.severity === "p1");
  const p2 = activeSignals.filter((s) => s.severity === "p2");
  // Surface higher-confidence signals first (P1 > P2 > Observe); signals
  // already arrive time-sorted from the API, so a stable sort keeps the
  // newest-first order within each severity tier.
  const severityRank: Record<string, number> = { p1: 0, p2: 1, observe: 2 };
  const prioritizedSignals = [...activeSignals].sort(
    (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
  );
  const lead = prioritizedSignals[0];
  const remaining = prioritizedSignals.slice(1, 8);
  const severityBadge: Record<string, string> = {
    p1: "bg-p1/10 text-p1",
    p2: "bg-p2/10 text-p2",
    observe: "bg-panel-3 text-text-dim",
  };

  return <div>
    <header className="page-heading">
      <div><h1>儀表板</h1><p>目前觀察名單的最新異常與規則觸發</p></div>
      <div className="flex items-center gap-2"><button className="toolbar-button">↻ 重掃</button><Link href="/rules" className="toolbar-button toolbar-button-primary">告警設定</Link></div>
    </header>

    <section className="grid gap-px border-b border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="今日 P1" value={p1.length} detail="高信心觸發" accent="text-p1" />
      <Stat label="今日 P2" value={p2.length} detail="中信心觸發" accent="text-p2" />
      <Stat label="觸發標的" value={new Set(activeSignals.map((s) => s.ticker)).size} detail={`觀察名單 ${watchlist.length} 個`} />
      <Stat label="平均分數" value={activeSignals.length ? (activeSignals.reduce((sum, s) => sum + s.score, 0) / activeSignals.length).toFixed(1) : "—"} detail={activeSignals.length ? `${activeSignals.length} 則目前訊號` : "等待下一次掃描"} />
    </section>

    {lead ? <section className="grid gap-px border-b border-border bg-border xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <article className="bg-bg px-6 py-6">
        <div className="mb-4 flex items-center justify-between gap-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${severityBadge[lead.severity]}`}><i className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />{lead.severity.toUpperCase()} · Composite signal</span><span className="font-mono text-[11px] text-text-faint">{fmtHourMinute(lead.triggered_at)} · {lead.asset_type}</span></div>
        <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-text">{lead.ticker} · {lead.name}</h2>
        <p className="mt-3 max-w-3xl text-[13.5px] leading-6 text-text-dim">{lead.rules.map((r) => r.detail || r.name).join(" · ")}</p>
        <div className="mt-5 grid items-end gap-5 border-y border-border py-4 sm:grid-cols-[auto_auto_1fr]">
          <span className="font-mono text-[30px] font-semibold tracking-tight">{lead.price.toLocaleString()}</span>
          <span className="font-mono text-sm font-semibold text-cyan">Score {lead.score.toFixed(1)}</span>
          <div className="flex gap-5 sm:justify-end">{lead.rules.slice(0, 3).map((r) => <div key={r.id}><p className="text-[10px] uppercase tracking-[0.1em] text-text-dim">{r.category}</p><p className="mt-1 font-mono text-xs font-semibold">{r.name}</p></div>)}</div>
        </div>
        <div className="mt-5 rounded-lg border border-cyan/25 bg-cyan/[0.06] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan">✦ Sentinel 觀點</p><p className="mt-1.5 leading-5 text-text">此訊號由 {lead.rules.length} 條規則共同構成。開啟完整分析可檢視每條規則與歷史觸發。</p></div>
        <div className="mt-5 flex flex-wrap gap-2"><Link href={`/detail/${lead.ticker}`} className="toolbar-button toolbar-button-primary">開啟深度分析 →</Link><Link href="/watchlist" className="toolbar-button">★ 追蹤</Link><button className="toolbar-button border-transparent bg-transparent text-text-dim">靜音 4h</button></div>
      </article>
      <aside className="bg-bg px-6 py-6"><div className="mb-3 flex items-baseline justify-between"><h2 className="section-label">同步觸發</h2><Link href="/signals" className="text-[11px] text-cyan">查看全部 →</Link></div><div>{remaining.map((s) => <Link key={s.id} href={`/detail/${s.ticker}#signal-${s.id}`} className="grid grid-cols-[42px_1fr_auto] gap-3 border-b border-border py-3 last:border-b-0 hover:text-cyan"><span className="font-mono text-xs font-bold text-text">{s.ticker}</span><span className="min-w-0 text-xs leading-5 text-text-dim">{s.rules[0]?.detail || s.rules[0]?.name || "訊號觸發"}<small className="mt-0.5 block font-mono text-[10px] text-text-faint">{fmtHourMinute(s.triggered_at)}</small></span><span className={`h-fit rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${severityBadge[s.severity]}`}>{s.score.toFixed(1)}</span></Link>)}</div></aside>
    </section> : <EmptyDashboard />}
  </div>;
}

function Stat({ label, value, detail, accent = "text-text" }: { label: string; value: string | number; detail: string; accent?: string }) { return <div className="stat-block"><p className="stat-label">{label}</p><p className={`stat-value ${accent}`}>{value}</p><p className="stat-detail">{detail}</p></div>; }
function EmptyDashboard() { return <div className="px-6 py-16 text-center"><p className="text-sm text-text-dim">目前觀察名單沒有訊號。系統每 5 分鐘自動掃描；歷史訊號可在 Signals 頁面查看。</p></div>; }
