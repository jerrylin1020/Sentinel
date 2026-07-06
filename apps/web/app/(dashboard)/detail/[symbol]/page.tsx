import { CandleChart, type ChartMarker } from "@/components/charts/CandleChart";
import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, getSignals } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";

const markerColor: Record<string, string> = { p1: "#ff3b58", p2: "#ffb627", observe: "#7a839a" };

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function DetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const all = await getSignals();
  const related = all.filter((s) => s.ticker === symbol);
  const head = related[0];

  const markers: ChartMarker[] = related.map((s) => ({
    time: new Date(s.triggered_at).toISOString().slice(0, 10),
    position: "aboveBar",
    color: markerColor[s.severity] ?? "#7a839a",
    shape: "circle",
    text: s.severity.toUpperCase(),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <h1 className="mono text-3xl font-bold">{symbol}</h1>
        {head && <span className="mono text-2xl text-text-dim">{head.price.toLocaleString()}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="K 線圖 · 日線 (訊號疊加)" className="lg:col-span-2">
          <CandleChart ticker={symbol} markers={markers} />
        </Panel>

        <Panel title={`觸發訊號 (${related.length})`}>
          {related.length === 0 ? (
            <p className="text-sm text-text-dim">此標的目前沒有訊號。</p>
          ) : (
            <ul className="space-y-3">
              {related.map((s) => (
                <li key={s.id} className="rounded border border-border bg-panel-2 p-2">
                  <div className="flex items-center gap-2">
                    <Tag className={severityColor[s.severity]}>{s.severity}</Tag>
                    <span className="mono">{s.score.toFixed(1)}</span>
                    <span className="mono ml-auto text-text-faint">{fmtTime(s.triggered_at)}</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {s.rules.map((r) => (
                      <li key={r.id} className="flex items-start gap-2 text-xs">
                        <Tag className={categoryColor[r.category] ?? "text-text-dim border-border-light"}>{r.name}</Tag>
                        <span className="text-text-dim">{r.detail || "—"}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
