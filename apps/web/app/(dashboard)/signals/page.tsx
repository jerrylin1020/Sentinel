import Link from "next/link";
import { categoryColor, getSignals } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";
import { fmtDateTime } from "@/lib/format";

export default async function SignalsPage() {
  const signals = await getSignals();
  return <div>
    <header className="page-heading"><div><h1>訊號</h1><p>所有規則、所有觸發 · 依時間排序</p></div><div className="flex gap-2"><button className="toolbar-button">匯出</button><Link className="toolbar-button toolbar-button-primary" href="/rules">＋ 新增告警</Link></div></header>
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-3"><span className="section-label">Severity</span><button className="rounded border border-border-light bg-panel-3 px-2.5 py-1 font-mono text-xs text-text">All</button><button className="rounded border border-border bg-panel px-2.5 py-1 font-mono text-xs text-text-dim">P1</button><button className="rounded border border-border bg-panel px-2.5 py-1 font-mono text-xs text-text-dim">P2</button><span className="ml-auto font-mono text-[11px] text-text-faint">{signals.length} signals</span></div>
    <div className="px-4 py-3 sm:px-6"><div className="mb-2 flex justify-between"><h2 className="text-sm font-semibold">今日</h2><span className="font-mono text-[11px] text-text-faint">{signals.length} 則</span></div>{signals.length ? <div>{signals.map((s) => <Link key={s.id} href={`/detail/${s.ticker}#signal-${s.id}`} className="grid gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-panel sm:grid-cols-[76px_66px_88px_minmax(0,1fr)_64px] sm:items-center"><time className="font-mono text-[11px] text-text-faint">{fmtDateTime(s.triggered_at)}</time><span className={`h-fit w-fit rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold ${severityColor[s.severity]}`}>{s.severity.toUpperCase()} · {s.score.toFixed(1)}</span><span><strong className="font-mono text-sm">{s.ticker}</strong><small className="ml-1 text-[11px] text-text-faint sm:ml-0 sm:block">{s.name}</small></span><span className="min-w-0 text-xs leading-5 text-text-dim"><strong className="font-medium text-cyan">{s.rules[0]?.name || "Signal"}</strong>{s.rules[0]?.detail ? ` · ${s.rules[0].detail}` : ""}</span><span className="font-mono text-right text-xs text-text">{s.price.toLocaleString()}</span></Link>)}</div> : <p className="py-12 text-center text-sm text-text-dim">目前沒有訊號。</p>}</div>
  </div>;
}
