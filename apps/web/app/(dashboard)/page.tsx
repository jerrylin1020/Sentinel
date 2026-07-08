import Link from "next/link";
import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, getSignals, getWatchlist } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";
import { fmtHourMinute } from "@/lib/format";

function fmtTime(iso: string) {
  return fmtHourMinute(iso);
}

export default async function DashboardPage() {
  const [signals, watchlist] = await Promise.all([getSignals(), getWatchlist()]);
  const p1 = signals.filter((s) => s.severity === "p1");
  const p2 = signals.filter((s) => s.severity === "p2");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Stat label="P1 訊號" value={p1.length} accent="text-p1" />
          <Stat label="P2 訊號" value={p2.length} accent="text-p2" />
          <Stat label="觀察名單" value={watchlist.length} accent="text-cyan" />
        </div>

        <Panel title="Top Signals · 最新異動">
          {signals.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-dim">
              目前沒有訊號。系統每 5 分鐘自動掃描，出現異常會即時顯示並推 Telegram。
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {signals.slice(0, 12).map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <Tag className={severityColor[s.severity]}>{s.severity}</Tag>
                  <Link href={`/detail/${s.ticker}`} className="mono w-24 font-semibold hover:text-cyan">
                    {s.ticker}
                  </Link>
                  <span className="mono w-12 text-text-dim">{s.score.toFixed(1)}</span>
                  <div className="flex flex-1 flex-wrap gap-1">
                    {s.rules.map((r) => (
                      <Tag key={r.id} className={categoryColor[r.category] ?? "text-text-dim border-border-light"} title={r.detail}>
                        {r.name}
                      </Tag>
                    ))}
                  </div>
                  <span className="mono w-14 text-right text-text-faint">{fmtTime(s.triggered_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Watchlist">
          <div className="grid grid-cols-2 gap-2">
            {watchlist.map((w) => (
              <Link
                key={w.watched.id}
                href={`/detail/${w.symbol.ticker}`}
                className="rounded border border-border bg-panel-2 px-3 py-2 hover:bg-panel-3"
              >
                <div className="mono text-sm font-semibold">{w.symbol.ticker}</div>
                <div className="text-xs text-text-dim">{w.symbol.name}</div>
              </Link>
            ))}
          </div>
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
