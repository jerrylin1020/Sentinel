import Link from "next/link";
import { DashboardHeaderActions } from "@/components/dashboard/DashboardHeaderActions";
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

// One ticker can fire the same rule repeatedly within a short window (e.g. an
// hourly candle check re-triggering every hour). Grouping by ticker keeps a
// single representative card per symbol so a noisy ticker can't crowd every
// other symbol out of a section, while a "×N" badge still surfaces how many
// times it fired.
type SignalGroup = { ticker: string; representative: ApiSignal; count: number; latestAt: string; history: ApiSignal[] };

function groupByTicker(signals: ApiSignal[]): SignalGroup[] {
  const byTicker = new Map<string, ApiSignal[]>();
  for (const signal of signals) {
    const existing = byTicker.get(signal.ticker);
    if (existing) existing.push(signal); else byTicker.set(signal.ticker, [signal]);
  }
  return Array.from(byTicker.values()).map((group) => ({
    ticker: group[0].ticker,
    representative: group[0], // input is pre-sorted score desc, so the first entry is the strongest
    count: group.length,
    latestAt: group.reduce((latest, s) => (s.triggered_at > latest ? s.triggered_at : latest), group[0].triggered_at),
    history: [...group].sort((a, b) => a.triggered_at.localeCompare(b.triggered_at)),
  }));
}

export default async function DashboardPage() {
  const [signals, watchlist] = await Promise.all([getSignals(), getWatchlist()]);
  const watchedTickers = new Set(watchlist.map((item) => item.symbol.ticker));
  const activeSignals = signals.filter((signal) => watchedTickers.has(signal.ticker));
  // Split into severity tiers so the dashboard can dedicate a section to each
  // one (P1 hero, P2 grid, Observe list) instead of a single time-sorted feed
  // where a lower-confidence signal could bury dozens of P2 triggers.
  // Within each tier, highest score first so the strongest signals lead.
  const byScoreDesc = (a: ApiSignal, b: ApiSignal) => b.score - a.score;
  const p1 = activeSignals.filter((s) => s.severity === "p1").sort(byScoreDesc);
  const p2 = activeSignals.filter((s) => s.severity === "p2").sort(byScoreDesc);
  const observe = activeSignals.filter((s) => s.severity === "observe").sort(byScoreDesc);
  const byGroupScoreDesc = (a: SignalGroup, b: SignalGroup) => b.representative.score - a.representative.score;
  const p1Groups = groupByTicker(p1).sort(byGroupScoreDesc);
  const p2Groups = groupByTicker(p2).sort(byGroupScoreDesc);
  const observeGroups = groupByTicker(observe).sort(byGroupScoreDesc);

  return <div>
    <header className="page-heading">
      <div><h1>儀表板</h1><p>目前觀察名單的最新異常與規則觸發</p></div>
      <div className="flex items-center gap-2"><DashboardHeaderActions /><Link href="/rules" className="toolbar-button toolbar-button-primary">告警設定</Link></div>
    </header>

    <section className="grid gap-px border-b border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
      <Stat label="今日 P1" value={p1.length} detail="高信心觸發" accent="text-p1" />
      <Stat label="今日 P2" value={p2.length} detail="中信心觸發" accent="text-p2" />
      <Stat label="觸發標的" value={new Set(activeSignals.map((s) => s.ticker)).size} detail={`觀察名單 ${watchlist.length} 個`} />
      <Stat label="平均分數" value={activeSignals.length ? (activeSignals.reduce((sum, s) => sum + s.score, 0) / activeSignals.length).toFixed(1) : "—"} detail={activeSignals.length ? `${activeSignals.length} 則目前訊號` : "等待下一次掃描"} />
    </section>

    {activeSignals.length ? <div className="space-y-8 px-6 py-6">
      <PrioritySection severity="p1" count={p1.length} tickerCount={p1Groups.length}>
        {p1Groups.length ? <>
          <LeadCard group={p1Groups[0]} />
          {p1Groups.length > 1 && <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{p1Groups.slice(1, 4).map((g) => <SignalCard key={g.ticker} group={g} />)}</div>}
        </> : <EmptyTier text="✓ 目前沒有 P1 高信心訊號 — 分數達此標的 P1 門檻，且至少 3 條規則同時觸發時會在此顯示醒目卡片。" />}
      </PrioritySection>

      <PrioritySection severity="p2" count={p2.length} tickerCount={p2Groups.length} viewAllHref="/signals?severity=p2">
        {p2Groups.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{p2Groups.slice(0, 6).map((g) => <SignalCard key={g.ticker} group={g} />)}</div> : <EmptyTier text="目前沒有 P2 中信心訊號。" />}
      </PrioritySection>

      <PrioritySection severity="observe" count={observe.length} tickerCount={observeGroups.length} viewAllHref="/signals?severity=observe">
        {observeGroups.length ? <div className="overflow-hidden rounded-lg border border-border">{observeGroups.slice(0, 5).map((g) => <ObserveRow key={g.ticker} group={g} />)}</div> : <EmptyTier text="目前沒有 Observe 觀察訊號。" />}
      </PrioritySection>
    </div> : <EmptyDashboard />}
  </div>;
}

function PrioritySection({ severity, count, tickerCount, viewAllHref, children }: { severity: Severity; count: number; tickerCount?: number; viewAllHref?: string; children: React.ReactNode }) {
  return <section>
    <div className="mb-3 flex items-baseline gap-3">
      <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold ${SEVERITY_BADGE[severity]}`}><i className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />{SEVERITY_LABEL[severity]}</span>
      <span className="font-mono text-[13px] text-text-dim">{count} 則{tickerCount != null && tickerCount > 0 && tickerCount < count ? ` · ${tickerCount} 個標的` : ""}</span>
      {viewAllHref && count > 0 && <Link href={viewAllHref} className="ml-auto text-[12px] text-cyan">查看全部 →</Link>}
    </div>
    {children}
  </section>;
}

function EmptyTier({ text }: { text: string }) {
  return <div className="rounded-lg border border-border bg-panel px-5 py-4 text-sm text-text-faint">{text}</div>;
}

function LeadCard({ group }: { group: SignalGroup }) {
  const { representative: signal, count, latestAt } = group;
  return <article className={`rounded-lg border p-6 ${signal.severity === "p1" ? "border-p1/35 bg-p1/[0.04]" : "border-p2/35 bg-p2/[0.04]"}`}>
    <div className="mb-4 flex items-center justify-between gap-4"><span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[12px] font-semibold ${SEVERITY_BADGE[signal.severity]}`}><i className="h-1.5 w-1.5 rounded-full bg-current shadow-[0_0_6px_currentColor]" />{signal.severity.toUpperCase()} · Composite signal{count > 1 ? ` · 連續觸發 ${count} 次` : ""}</span><span className="font-mono text-[12px] text-text-faint">{fmtHourMinute(latestAt)} · {signal.asset_type}</span></div>
    <h2 className="max-w-3xl text-2xl font-semibold leading-tight tracking-tight text-text">{signal.ticker} · {signal.name}</h2>
    <p className="mt-3 max-w-3xl text-[14.5px] leading-6 text-text-dim">{signal.rules.map((r) => r.detail || r.name).join(" · ")}</p>
    <div className="mt-5 grid items-end gap-5 border-y border-border py-4 sm:grid-cols-[auto_auto_1fr]">
      <span className="font-mono text-[32px] font-semibold tracking-tight">{signal.price.toLocaleString()}</span>
      <span className="font-mono text-base font-semibold text-cyan">Score {signal.score.toFixed(1)}</span>
      <div className="flex gap-5 sm:justify-end">{signal.rules.slice(0, 3).map((r) => <div key={r.id}><p className="text-[11px] uppercase tracking-[0.1em] text-text-dim">{r.category}</p><p className="mt-1 font-mono text-[13px] font-semibold">{r.name}</p></div>)}</div>
    </div>
    <div className="mt-5 rounded-lg border border-cyan/25 bg-cyan/[0.06] p-4"><p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-cyan">✦ Sentinel 觀點</p><p className="mt-1.5 leading-5 text-text">此訊號由 {signal.rules.length} 條規則共同構成。開啟完整分析可檢視每條規則與歷史觸發。</p></div>
    <div className="mt-5 flex flex-wrap gap-2"><Link href={`/detail/${signal.ticker}`} className="toolbar-button toolbar-button-primary">開啟深度分析 →</Link><Link href="/watchlist" className="toolbar-button">★ 追蹤</Link><button className="toolbar-button border-transparent bg-transparent text-text-dim">靜音 4h</button></div>
  </article>;
}

function SignalCard({ group }: { group: SignalGroup }) {
  const { representative: signal, count, latestAt, history } = group;
  return <Link href={`/detail/${signal.ticker}#signal-${signal.id}`} className="block rounded-lg border border-border bg-panel p-4 transition-colors hover:border-border-light">
    <div className="mb-2 flex items-center gap-2"><span className="font-mono text-[14.5px] font-bold text-text">{signal.ticker}</span>{count > 1 && <span className="rounded-full bg-cyan/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-cyan">×{count}</span>}<span className={`ml-auto rounded px-1.5 py-0.5 font-mono text-[12px] font-bold ${SEVERITY_BADGE[signal.severity]}`}>{signal.score.toFixed(1)}</span></div>
    <p className="text-[13px] leading-5 text-text-dim">{signal.rules[0]?.detail || signal.rules[0]?.name || "訊號觸發"}</p>
    {count > 1 && <Spark history={history} severity={signal.severity} />}
    <p className="mt-2 font-mono text-[11.5px] text-text-faint">{fmtHourMinute(latestAt)}{count > 1 ? ` · 連續 ${count} 次觸發` : ""}</p>
  </Link>;
}

function Spark({ history, severity }: { history: ApiSignal[]; severity: Severity }) {
  const bars = history.slice(-10);
  const barColor = severity === "p1" ? "bg-p1" : severity === "p2" ? "bg-p2" : "bg-text-dim";
  // Each bar is one past trigger for this ticker (oldest -> newest, left to right);
  // height reflects that occurrence's score. Hover a bar to see its exact time/score.
  return <div className="mt-2 flex items-end gap-[3px]" title="每個長條代表一次過去的觸發，由左到右依時間排序">
    {bars.map((s) => <span key={s.id} title={`${fmtHourMinute(s.triggered_at)} · Score ${s.score.toFixed(1)}`} className={`w-[5px] cursor-help rounded-sm opacity-70 ${barColor}`} style={{ height: `${Math.max(4, Math.min(16, Math.round((s.score / 5) * 16)))}px` }} />)}
  </div>;
}

function ObserveRow({ group }: { group: SignalGroup }) {
  const { representative: signal, count, latestAt } = group;
  return <Link href={`/detail/${signal.ticker}#signal-${signal.id}`} className="grid grid-cols-[90px_1fr_90px_60px] items-center gap-3 border-b border-border px-4 py-2.5 text-[13px] last:border-b-0 hover:bg-panel">
    <span className="flex items-center gap-1.5 font-mono font-bold text-text">{signal.ticker}{count > 1 && <span className="rounded-full bg-cyan/10 px-1 py-0.5 font-mono text-[10px] font-bold text-cyan">×{count}</span>}</span>
    <span className="min-w-0 truncate text-text-dim">{signal.rules[0]?.detail || signal.rules[0]?.name || "訊號觸發"}</span>
    <span className="font-mono text-[11px] text-text-faint">{fmtHourMinute(latestAt)}</span>
    <span className="text-right font-mono text-[12px] text-text-dim">{signal.score.toFixed(1)}</span>
  </Link>;
}

function Stat({ label, value, detail, accent = "text-text" }: { label: string; value: string | number; detail: string; accent?: string }) { return <div className="stat-block"><p className="stat-label">{label}</p><p className={`stat-value ${accent}`}>{value}</p><p className="stat-detail">{detail}</p></div>; }
function EmptyDashboard() { return <div className="px-6 py-16 text-center"><p className="text-sm text-text-dim">目前觀察名單沒有訊號。系統每 5 分鐘自動掃描；歷史訊號可在 Signals 頁面查看。</p></div>; }
