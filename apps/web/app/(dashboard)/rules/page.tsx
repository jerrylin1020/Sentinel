import { Panel, Tag } from "@/components/ui/Panel";
import { rules } from "@/lib/fixtures";

const catColor: Record<string, string> = {
  volume: "text-cyan border-cyan/40",
  technical: "text-amber border-amber/40",
  onchain: "text-up border-up/40",
  news: "text-blue border-blue/40",
};

export default function RulesPage() {
  return (
    <Panel title="Rules · 規則設定與回測">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
            <th className="py-2">規則</th>
            <th>類別</th>
            <th className="text-right">權重</th>
            <th className="text-right">勝率</th>
            <th className="text-right">假訊號率</th>
            <th className="text-right">觸發/日</th>
            <th className="text-right">狀態</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b border-border hover:bg-panel-2">
              <td className="py-2 font-medium">{r.name}</td>
              <td>
                <Tag className={catColor[r.category] ?? "text-text-dim border-border-light"}>{r.category}</Tag>
              </td>
              <td className="mono text-right">{r.weight.toFixed(1)}</td>
              <td className="mono text-right text-up">{(r.winRate * 100).toFixed(0)}%</td>
              <td className="mono text-right text-down">{(r.falsePositive * 100).toFixed(0)}%</td>
              <td className="mono text-right">{r.triggersPerDay.toFixed(1)}</td>
              <td className="text-right">
                <Tag className={r.enabled ? "text-up border-up/40" : "text-text-faint border-border-light"}>
                  {r.enabled ? "ON" : "OFF"}
                </Tag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}
