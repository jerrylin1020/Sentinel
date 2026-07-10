import Link from "next/link";
import { getSignals, type Severity } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";
import { fmtDateTime } from "@/lib/format";

const validSeverities: Severity[] = ["p1", "p2", "observe"];

export default async function SignalsPage({ searchParams }: { searchParams: { severity?: string; view?: string } }) {
  const severity = validSeverities.includes(searchParams.severity as Severity) ? (searchParams.severity as Severity) : undefined;
  const digest = searchParams.view === "digest";
  const signals = await getSignals(severity);
  const title = digest ? "訊號摘要" : severity ? `${severity.toUpperCase()} 訊號` : "訊號";

  return <div>
    <header className="page-heading"><div><h1>{title}</h1><p>{digest ? "今日所有觸發的彙整" : "所有規則、所有觸發 · 依時間排序"}</p></div><div className="flex gap-2"><button className="toolbar-button">匯出</button><Link className="toolbar-button toolbar-button-primary" href="/rules">規則設定</Link></div></header>
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3"><span className="section-label">Severity</span><Filter href="/signals" active={!severity}>All</Filter><Filter href="/signals?severity=p1" active={severity === "p1"}>P1</Filter><Filter href="/signals?severity=p2" active={severity === "p2"}>P2</Filter><Filter href="/signals?severity=observe" active={severity === "observe"}>Observe</Filter><span className="ml-auto font-mono text-[11px] text-text-faint">{signals.length} signals</span></div>
    <section className="mx-6 mt-5 rounded-lg border border-border bg-panel p-4"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="section-label text-text">訊號分級說明</h2><Link href="/watchlist" className="text-xs text-cyan">調整個別標的 P1 門檻 →</Link></div><div className="mt-3 grid gap-3 text-xs leading-5 text-text-dim md:grid-cols-3"><p><strong className="text-p1">P1 高信心</strong><br />分數達此標的 P1 門檻，且至少 3 條規則同時觸發。</p><p><strong className="text-p2">P2 中信心</strong><br />未達 P1，但至少有一條底層規則的等級是 P1 或 P2。</p><p><strong className="text-text">Observe 觀察</strong><br />其餘觸發只記錄、不推播。系統目前沒有 P3。</p></div></section>
    <div className="px-4 py-5 sm:px-6"><div className="mb-2 flex justify-between"><h2 className="text-sm font-semibold">{digest ? "今日訊號摘要" : "訊號列表"}</h2><span className="font-mono text-[11px] text-text-faint">{signals.length} 則</span></div>{signals.length ? <div>{signals.map((s) => <Link key={s.id} href={`/detail/${s.ticker}#signal-${s.id}`} className="signal-row grid gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-panel sm:grid-cols-[76px_66px_88px_minmax(0,1fr)_64px] sm:items-center"><time className="font-mono text-[11px] text-text-faint">{fmtDateTime(s.triggered_at)}</time><span className={`h-fit w-fit rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${severityColor[s.severity]}`}>{s.severity.toUpperCase()} · {s.score.toFixed(1)}</span><span><strong className="font-mono text-sm">{s.ticker}</strong><small className="ml-1 text-[11px] text-text-faint sm:ml-0 sm:block">{s.name}</small></span><span className="min-w-0 text-xs leading-5 text-text-dim"><strong className="font-medium text-cyan">{s.rules[0]?.name || "Signal"}</strong>{s.rules[0]?.detail ? ` · ${s.rules[0].detail}` : ""}</span><span className="font-mono text-right text-xs text-text">{s.price.toLocaleString()}</span></Link>)}</div> : <p className="py-12 text-center text-sm text-text-dim">目前沒有符合條件的訊號。</p>}</div>
  </div>;
}

function Filter({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) { return <Link href={href} className={`rounded border px-2.5 py-1 font-mono text-xs ${active ? "border-border-light bg-panel-3 text-text" : "border-border bg-panel text-text-dim hover:text-text"}`}>{children}</Link>; }
