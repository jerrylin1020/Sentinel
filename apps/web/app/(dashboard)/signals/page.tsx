import Link from "next/link";
import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, getSignals } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function SignalsPage() {
  const signals = await getSignals();

  return (
    <Panel title={`Signals · 所有觸發訊號 (${signals.length})`}>
      {signals.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-dim">
          目前沒有訊號。cron 每 5 分鐘掃描一次，市場出現異常時這裡會自動出現。
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
              <th className="py-2">Sev</th>
              <th>Ticker</th>
              <th>Score</th>
              <th>Tags</th>
              <th className="text-right">Price</th>
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
                      <Tag key={t} className={categoryColor[t] ?? "text-text-dim border-border-light"}>
                        {t}
                      </Tag>
                    ))}
                  </div>
                </td>
                <td className="mono text-right">{s.price.toLocaleString()}</td>
                <td className="mono text-right text-text-faint">{fmtTime(s.triggered_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
