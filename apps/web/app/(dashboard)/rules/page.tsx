import { RulesManager } from "@/components/rules/RulesManager";
import { getRules } from "@/lib/api";

export default async function RulesPage() {
  const rules = await getRules();
  const hasBacktest = rules.some((r) => r.backtest);

  return <div>
    <header className="page-heading"><div><h1>規則</h1><p>{rules.length} 條規則 · 設定與回測結果</p></div></header>
    <div className="p-6">
      {!hasBacktest && (
        <p className="mb-3 rounded border border-border-light bg-panel-2 px-3 py-2 text-xs text-text-dim">
          尚無回測資料。執行 <span className="mono text-text">python scripts/run_backtest.py</span> 來計算各規則的勝率。
        </p>
      )}
      <RulesManager initial={rules} />
    </div>
  </div>;
}
