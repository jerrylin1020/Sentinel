import { Panel, Tag } from "@/components/ui/Panel";
import { getWatchlist } from "@/lib/api";

export default async function WatchlistPage() {
  const items = await getWatchlist();

  return (
    <Panel title={`Watchlist · 觀察名單 (${items.length})`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
            <th className="py-2">Ticker</th>
            <th>Name</th>
            <th>Type</th>
            <th>Group</th>
            <th className="text-right">P1 門檻</th>
            <th className="text-right">量倍數</th>
            <th className="text-right">啟用規則</th>
            <th>推播</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.watched.id} className="border-b border-border hover:bg-panel-2">
              <td className="mono py-2 font-semibold">{it.symbol.ticker}</td>
              <td className="text-text-dim">{it.symbol.name}</td>
              <td>
                <Tag className={it.symbol.asset_type === "crypto" ? "text-amber border-amber/40" : "text-blue border-blue/40"}>
                  {it.symbol.asset_type}
                </Tag>
              </td>
              <td className="text-text-dim">{it.watched.group}</td>
              <td className="mono text-right">{it.watched.p1_score_threshold.toFixed(1)}</td>
              <td className="mono text-right">{it.watched.volume_multiplier.toFixed(1)}x</td>
              <td className="mono text-right">{it.watched.enabled_rules.length}</td>
              <td className="flex gap-1 py-2">
                {it.watched.channels.map((c) => (
                  <Tag key={c} className="text-text-dim border-border-light">
                    {c}
                  </Tag>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
