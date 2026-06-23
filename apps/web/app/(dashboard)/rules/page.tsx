import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, getRules } from "@/lib/api";

export default async function RulesPage() {
  const rules = await getRules();
  const hasBacktest = rules.some((r) => r.backtest);

  return (
    <Panel title={`Rules · 規則設定與回測 (${rules.length})`}>
      {!hasBacktest && (
        <p className="mb-3 rounded border border-border-light bg-panel-2 px-3 py-2 text-xs text-text-dim">
          尚無回測資料。執行 <span className="mono text-text">python scripts/run_backtest.py</span> 來計算各規則的勝率。
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
            <th className="py-2">規則</th>
            <th>類別</th>
            <th className="text-right">權重</th>
            <th className="text-right">勝率</th>
            <th className="text-right">平均報酬</th>
            <th className="text-right">假訊號率</th>
            <th className="text-right">Sharpe</th>
            <th className="text-right">樣本數</th>
            <th className="text-right">狀態</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => {
            const b = r.backtest;
            return (
              <tr key={r.id} className="border-b border-border hover:bg-panel-2">
                <td className="py-2">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-text-dim">{r.description}</div>
                </td>
                <td>
                  <Tag className={categoryColor[r.category] ?? "text-text-dim border-border-light"}>{r.category}</Tag>
                </td>
                <td className="mono text-right">{r.weight.toFixed(1)}</td>
                <td className="mono text-right text-up">{b ? `${(b.win_rate * 100).toFixed(0)}%` : "—"}</td>
                <td className={`mono text-right ${b && b.avg_return >= 0 ? "text-up" : "text-down"}`}>
                  {b ? `${(b.avg_return * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="mono text-right text-down">{b ? `${(b.false_positive_rate * 100).toFixed(0)}%` : "—"}</td>
                <td className="mono text-right">{b ? b.sharpe.toFixed(2) : "—"}</td>
                <td className="mono text-right text-text-faint">{b ? b.sample_triggers : "—"}</td>
                <td className="text-right">
                  <Tag className={r.enabled ? "text-up border-up/40" : "text-text-faint border-border-light"}>
                    {r.enabled ? "ON" : "OFF"}
                  </Tag>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}
