import Link from "next/link";
import { Panel, Tag } from "@/components/ui/Panel";
import { severityColor, signals, tagColor, watchlist } from "@/lib/fixtures";

export default function DashboardPage() {
  const p1 = signals.filter((s) => s.severity === "p1");
  const p2 = signals.filter((s) => s.severity === "p2");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="P1 今日訊號" value={p1.length} accent="text-p1" />
          <Stat label="P2 彙整" value={p2.length} accent="text-p2" />
          <Stat label="觀察名單" value={watchlist.length} accent="text-cyan" />
        </div>

        <Panel title="Top Signals · 今日異動">
          <ul className="divide-y divide-border">
            {signals.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2">
                <Tag className={severityColor[s.severity]}>{s.severity}</Tag>
                <Link href={`/detail/${s.ticker}`} className="mono w-24 font-semibold hover:text-cyan">
                  {s.ticker}
                </Link>
                <span className="mono w-16 text-text-dim">{s.score.toFixed(1)}</span>
                <div className="flex flex-1 flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <Tag key={t} className={tagColor[t]}>
                      {t}
                    </Tag>
                  ))}
                </div>
                <span className="hidden flex-1 text-text-dim md:block">{s.detail}</span>
                <span className="mono w-14 text-right text-text-faint">{s.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Watchlist 熱力">
          <div className="grid grid-cols-2 gap-2">
            {watchlist.map((w) => (
              <Link
                key={w.id}
                href={`/detail/${w.ticker}`}
                className="rounded border border-border bg-panel-2 px-3 py-2 hover:bg-panel-3"
              >
                <div className="mono text-sm font-semibold">{w.ticker}</div>
                <div className="text-xs text-text-dim">{w.group}</div>
              </Link>
            ))}
          </div>
        </Panel>
        <Panel title="News 新聞流">
          <ul className="space-y-2 text-xs">
            <li className="text-text-dim">NVDA — Analyst raises target to $1,200 <span className="text-up">+</span></li>
            <li className="text-text-dim">BTC — ETF net inflow hits weekly high <span className="text-up">+</span></li>
            <li className="text-text-dim">AAPL — Supply chain caution note <span className="text-down">−</span></li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <Panel>
      <div className="text-xs text-text-dim">{label}</div>
      <div className={`mono text-3xl font-bold ${accent}`}>{value}</div>
    </Panel>
  );
}
