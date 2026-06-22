import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, getRules } from "@/lib/api";

export default async function RulesPage() {
  const rules = await getRules();

  return (
    <Panel title={`Rules · 規則設定 (${rules.length})`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-dim">
            <th className="py-2">規則</th>
            <th>類別</th>
            <th>適用</th>
            <th className="text-right">權重</th>
            <th className="text-right">狀態</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b border-border hover:bg-panel-2">
              <td className="py-2">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-text-dim">{r.description}</div>
              </td>
              <td>
                <Tag className={categoryColor[r.category] ?? "text-text-dim border-border-light"}>{r.category}</Tag>
              </td>
              <td className="text-xs text-text-dim">{r.applies_to.join(", ")}</td>
              <td className="mono text-right">{r.weight.toFixed(1)}</td>
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
