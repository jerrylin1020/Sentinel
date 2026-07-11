import Link from "next/link";
import { getSignals, getWatchlist, type ApiSignal, type Severity } from "@/lib/api";
import { fmtHourMinute } from "@/lib/format";

const SEVERITY_BADGE: Record<Severity, string> = {
  p1: "bg-p1/10 text-p1",
  p2: "bg-p2/10 text-p2",
  observe: "bg-panel-3 text-text-dim",
};

const SEVERITY_LABEL: Record<Severity, string> = {
  p1: "P1 高信心",
  p2: "P2 中信心",
  observe: "Observe 觀察",
};

export default async function DashboardPage() {
  const [signals, watchlist] = await Promise.all([getSignals(), getWatchlist()]);
  const watchedTickers = new Set(watchlist.map((item) => item.symbol.ticker));
  const activeSignals = signals.filter((signal) => watchedTickers.has(signal.ticker));
  // Split into severity tiers so the dashboard can dedicate a section to each
  // one (P1 hero, P2 grid, Observe list) instead of a single time-sorted feed
  // where a lower-confidence signal could bury dozens of P2 triggers.
  const p1 = activeSignals.filter((s) => s.severity === "p1");
  const p2 = activeSignals.filter((s) => s.severity === "p2");
  const observe = activeSignals.filter((s) => s.severity === "observe");

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

    {activeSignals.length ? <div className="space-y-8 px-6 py-6">
      <PrioritySection severity="p1" count={p1.length}>
        {p1.length ? <>
          <LeadCard signal={p1[0]} />
          {p1.length > 1 && <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{p1.slice(1, 4).map((s) => <SignalCard key={s.id} signal={s} />)}</div>}
        </> : <EmptyTier text="✓ 目前沒有 P1 高信心訊號 — 分數達此標的 P1 門檻，且至少 3 條規則同時觸發時會在此顯示醒目卡片。" />}
      </PrioritySection>

      <PrioritySection severity="p2" count={p2.length} viewAllHref="/signals?severity=p2">
        {p2.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{p2.slice(0, 6).map((s) => <SignalCard key={s.id} signal={s} />)}</div> : <EmptyTier text="目前沒有 P2 中信心訊號。" />}
      </PrioritySection>

      <PrioritySection severity="observe" count={observe.length} viewAllHref="/signals?severity=observe">
        {observe.length ? <div className="overflow-hidden rounded-lg border border-border">{observe.slice(0, 5).map((s) => <ObserveRow key={s.id} signal={s} />)}</div> : <EmptyTier text="目前沒有 Observe 觀察訊號。" />}
      </PrioritySection>
    </div> : <EmptyDashboard />}
  </div>;
}

function PrioritySection({ severity, count, viewAllHref, children }: { severity: Severity; count: number; viewAllHref?: string; children: React.ReactNode }) {
  return <section>
    <div className="mb-3 flex items-baseline gap-3">
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_BADGE[severity]}`}><i className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />{SEVERITY_LABEL[severity]}</span>
      <span className="font-mono text-xs text-text-dim">{count} 則</span>
      {viewAllHref && count > 0 && <Link href={viewAllHref} className="ml-auto text-[11px] text-cyan">查看全部 →</Link>}
    </div>
    {children}
  </section>;
}

function EmptyTier({ text }: { text: string }) {
  return <div className="rounded-lg border border-border bg-panel px-5 py-4 text-[13px] text-text-faint">{text}</div>;
}

function LeadCard({ signal }: { signal: ApiSignal }) {
  return <article className={`rounded-lg border p-6 ${signal.severity === "p1" ? "border-p1/35 bg-p1/[0.04]" : "border-p2/35 bg-p2/[0.04]"}`}>
    <div className="mb-4 flex items-center justify-between gap-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold ${SEVERITY_BADGE[signal.severity]}`}><i className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />{signal.severity.toUpperCase()} · Composite signal</span><span className="font-mono text-[11px] text-text-faint">{fmtHourMinute(signal.triggered_at)} · {signal.asset_type}</span></div>
    <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-text">{signal.ticker} · {signal.name}</h2>
    <p className="mt-3 max-w-3xl text-[13.5px] leading-6 text-text-dim">{signal.rules.map((r) => r.detail || r.name).join(" · ")}</p>
    <div className="mt-5 grid items-end gap-5 border-y border-border py-4 sm:grid-cols-[auto_auto_1fr]">
      <span className="font-mono text-[30px] font-semibold tracking-tight">{signal.price.toLocaleString()}</span>
      <span className="font-mono text-sm font-semibold text-cyan">Score {signal.score.toFixed(1)}</span>
      <div className="flex gap-5 sm:justify-end">{signal.rules.slice(0, 3).map((r) => <div key={r.id}><p className="text-[10px] uppercase tracking-[0.1em] text-text-dim">{r.category}</p><p className="mt-1 font-mono text-xs font-semibold">{r.name}</p></div>)}</div>
    </div>
    <div className="mt-5 rounded-lg border border-cyan/25 bg-cyan/[0.06] p-4"><p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan">✦ Sentinel 觀點</p><p className="mt-1.5 leading-5 text-text">此訊號由 {signal.rules.length} 條規則共同構成。開啟完整分析可檢視每條規則與歷史觸發。</p></div>
    <div className="mt-5 flex flex-wrap gap-2"><Link href={`/detail/${signal.ticker}`} className="toolbar-button toolbar-button-primary">開啟深度分析 →</Link><Link href="/watchlist" className="toolbar-button">★ 追蹤</Link><button className="toolbar-button border-transparent bg-transparent text-text-dim">靜音 4h</button></div>
  </article>;
}

function SignalCard({ signal }: { signal: ApiSignal }) {
  return <Link href={`/detail/${signal.ticker}#signal-${signal.id}`} className="block rounded-lg border border-border bg-panel p-4 transition-colors hover:border-border-light">
    <div className="mb-2 flex items-center justify-between"><span className="font-mono text-[13.5px] font-bold text-text">{signal.ticker}</span><span className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${SEVERITY_BADGE[signal.severity]}`}>{signal.score.toFixed(1)}</span></div>
    <p className="text-xs leading-5 text-text-dim">{signal.rules[0]?.detail || signal.rules[0]?.name || "訊號觸發"}</p>
    <p className="mt-2 font-mono text-[10.5px] text-text-faint">{fmtHourMinute(signal.triggered_at)}</p>
  </Link>;
}

function ObserveRow({ signal }: { signal: ApiSignal }) {
  return <Link href={`/detail/${signal.ticker}#signal-${signal.id}`} className="grid grid-cols-[90px_1fr_90px_60px] items-center gap-3 border-b border-border px-4 py-2.5 text-xs last:border-b-0 hover:bg-panel">
    <span className="font-mono font-bold text-text">{signal.ticker}</span>
    <span className="min-w-0 truncate text-text-dim">{signal.rules[0]?.detail || signal.rules[0]?.name || "訊號觸發"}</span>
    <span className="font-mono text-[10px] text-text-faint">{fmtHourMinute(signal.triggered_at)}</span>
    <span className="text-right font-mono text-[11px] text-text-dim">{signal.score.toFixed(1)}</span>
  </Link>;
}

function Stat({ label, value, detail, accent = "text-text" }: { label: string; value: string | number; detail: string; accent?: string }) { return <div className="stat-block"><p className="stat-label">{label}</p><p className={`stat-value ${accent}`}>{value}</p><p className="stat-detail">{detail}</p></div>; }
function EmptyDashboard() { return <div className="px-6 py-16 text-center"><p className="text-sm text-text-dim">目前觀察名單沒有訊號。系統每 5 分鐘自動掃描；歷史訊號可在 Signals 頁面查看。</p></div>; }
