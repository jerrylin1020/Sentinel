import { Panel, Tag } from "@/components/ui/Panel";
import { severityColor, signals, tagColor } from "@/lib/fixtures";

export default function DetailPage({ params }: { params: { symbol: string } }) {
  const symbol = decodeURIComponent(params.symbol);
  const related = signals.filter((s) => s.ticker === symbol);
  const head = related[0];

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <h1 className="mono text-3xl font-bold">{symbol}</h1>
        {head && (
          <>
            <span className="mono text-2xl">{head.price.toLocaleString()}</span>
            <span className={`mono text-lg ${head.change >= 0 ? "text-up" : "text-down"}`}>
              {head.change >= 0 ? "+" : ""}
              {head.change.toFixed(2)}%
            </span>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="K 線圖 (placeholder)" className="lg:col-span-2">
          <div className="flex h-72 items-center justify-center rounded border border-dashed border-border-light text-text-faint">
            Lightweight Charts 待接 — 訊號疊加
          </div>
        </Panel>

        <Panel title="觸發訊號">
          {related.length === 0 ? (
            <p className="text-sm text-text-dim">此標的目前沒有訊號。</p>
          ) : (
            <ul className="space-y-3">
              {related.map((s) => (
                <li key={s.id} className="rounded border border-border bg-panel-2 p-2">
                  <div className="flex items-center gap-2">
                    <Tag className={severityColor[s.severity]}>{s.severity}</Tag>
                    <span className="mono">{s.score.toFixed(1)}</span>
                    <span className="mono ml-auto text-text-faint">{s.time}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <Tag key={t} className={tagColor[t]}>
                        {t}
                      </Tag>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-text-dim">{s.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
