import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, getSignals } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function DetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const all = await getSignals();
  const related = all.filter((s) => s.ticker === symbol);
  const head = related[0];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <h1 className="mono text-3xl font-bold">{symbol}</h1>
        {head && <span className="mono text-2xl text-text-dim">{head.price.toLocaleString()}</span>}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="K 線圖 (placeholder)" className="lg:col-span-2">
          <div className="flex h-72 items-center justify-center rounded border border-dashed border-border-light text-text-faint">
            Lightweight Charts 待接 — 訊號疊加
          </div>
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
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <Tag key={t} className={categoryColor[t] ?? "text-text-dim border-border-light"}>
                        {t}
                      </Tag>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
