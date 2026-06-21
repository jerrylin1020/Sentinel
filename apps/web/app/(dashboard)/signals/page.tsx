import Link from "next/link";
import { Panel, Tag } from "@/components/ui/Panel";
import { severityColor, signals, tagColor } from "@/lib/fixtures";

export default function SignalsPage() {
  return (
    <Panel title="Signals · 所有觸發訊號">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
            <th className="py-2">Sev</th>
            <th>Ticker</th>
            <th>Score</th>
            <th>Tags</th>
            <th className="hidden md:table-cell">Detail</th>
            <th className="text-right">Price</th>
            <th className="text-right">Chg%</th>
            <th className="text-right">Time</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.id} className="border-b border-border hover:bg-panel-2">
              <td className="py-2">
                <Tag className={severityColor[s.severity]}>{s.severity}</Tag>
              </td>
              <td>
                <Link href={`/detail/${s.ticker}`} className="mono font-semibold hover:text-cyan">
                  {s.ticker}
                </Link>
              </td>
              <td className="mono">{s.score.toFixed(1)}</td>
              <td>
                <div className="flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <Tag key={t} className={tagColor[t]}>
                      {t}
                    </Tag>
                  ))}
                </div>
              </td>
              <td className="hidden text-text-dim md:table-cell">{s.detail}</td>
              <td className="mono text-right">{s.price.toLocaleString()}</td>
              <td className={`mono text-right ${s.change >= 0 ? "text-up" : "text-down"}`}>
                {s.change >= 0 ? "+" : ""}
                {s.change.toFixed(2)}
              </td>
              <td className="mono text-right text-text-faint">{s.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
