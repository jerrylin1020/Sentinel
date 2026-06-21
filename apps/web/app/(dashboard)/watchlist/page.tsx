import { Panel, Tag } from "@/components/ui/Panel";
import { watchlist } from "@/lib/fixtures";

export default function WatchlistPage() {
  return (
    <Panel
      title="Watchlist · 觀察名單管理"
      action={<button className="rounded border border-border-light px-2 py-1 text-xs hover:bg-panel-2">+ 新增標的</button>}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
            <th className="py-2">Ticker</th>
            <th>Name</th>
            <th>Type</th>
            <th>Group</th>
            <th className="text-right">P1 門檻</th>
            <th className="text-right">啟用規則</th>
            <th>推播</th>
          </tr>
        </thead>
        <tbody>
          {watchlist.map((w) => (
            <tr key={w.id} className="border-b border-border hover:bg-panel-2">
              <td className="mono py-2 font-semibold">{w.ticker}</td>
              <td className="text-text-dim">{w.name}</td>
              <td>
                <Tag className={w.type === "crypto" ? "text-amber border-amber/40" : "text-blue border-blue/40"}>
                  {w.type}
                </Tag>
              </td>
              <td className="text-text-dim">{w.group}</td>
              <td className="mono text-right">{w.threshold.toFixed(1)}</td>
              <td className="mono text-right">{w.rules}</td>
              <td className="flex gap-1 py-2">
                {w.channels.map((c) => (
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
