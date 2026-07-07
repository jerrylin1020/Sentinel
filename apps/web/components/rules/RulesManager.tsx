"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiPatch, type ApiRule } from "@/lib/api";
import { Tag } from "@/components/ui/Panel";
import { categoryColor } from "@/lib/api";

export function RulesManager({ initial }: { initial: ApiRule[] }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      {initial.map((r) => (
        <RuleRow key={r.id} rule={r} onSaved={() => router.refresh()} />
      ))}
    </div>
  );
}

function RuleRow({ rule, onSaved }: { rule: ApiRule; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(rule.enabled);
  const [weight, setWeight] = useState(rule.weight);
  const [params, setParams] = useState<Record<string, number>>(
    Object.fromEntries(
      Object.entries(rule.params).filter(([, v]) => typeof v === "number") as [string, number][],
    ),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const b = rule.backtest;

  async function save(next?: Partial<{ enabled: boolean }>) {
    setSaving(true);
    const body = { enabled: next?.enabled ?? enabled, weight, params };
    await apiPatch(`/rules/${rule.id}`, body);
    setSaving(false);
    setSaved(true);
    onSaved();
  }

  return (
    <div className={`rounded border p-3 ${enabled ? "border-border bg-panel" : "border-border bg-panel/40 opacity-70"}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => { const v = !enabled; setEnabled(v); save({ enabled: v }); }}
          className={`rounded border px-2 py-1 text-xs ${enabled ? "border-up/50 text-up" : "border-border-light text-text-faint"}`}
        >
          {enabled ? "ON" : "OFF"}
        </button>
        <span className="font-medium">{rule.name}</span>
        <Tag className={categoryColor[rule.category] ?? "text-text-dim border-border-light"}>{rule.category}</Tag>
        <Tag className="text-cyan border-cyan/40" title="這條規則的 K 線週期（lookback 以此為單位）">
          {rule.timeframe}
        </Tag>
        {b && (
          <span className="ml-auto flex gap-3 text-xs text-text-dim">
            <span>勝率 <span className="text-up">{(b.win_rate * 100).toFixed(0)}%</span></span>
            <span>平均 <span className={b.avg_return >= 0 ? "text-up" : "text-down"}>{(b.avg_return * 100).toFixed(1)}%</span></span>
            <span>Sharpe {b.sharpe.toFixed(2)}</span>
            <span>樣本 {b.sample_triggers}</span>
          </span>
        )}
        {!b && rule.data_source !== "candles" && (
          <span className="ml-auto text-xs text-text-faint">尚未支援回測（非日K資料來源）</span>
        )}
      </div>
      {rule.description && <p className="mt-1 text-xs text-text-dim">{rule.description}</p>}

      <div className="mt-3 flex flex-wrap items-end gap-4">
        <Field label="權重">
          <input type="number" step="0.1" value={weight} onChange={(e) => { setWeight(+e.target.value); setSaved(false); }}
            className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1" />
        </Field>
        {Object.entries(params).map(([k, v]) => (
          <Field key={k} label={k}>
            <input type="number" step="any" value={v}
              onChange={(e) => { setParams({ ...params, [k]: +e.target.value }); setSaved(false); }}
              className="w-24 rounded border border-border-light bg-panel-2 px-2 py-1" />
          </Field>
        ))}
        <button onClick={() => save()} disabled={saving}
          className="rounded border border-cyan/50 bg-cyan/10 px-3 py-1 text-sm text-cyan hover:bg-cyan/20 disabled:opacity-50">
          {saving ? "儲存中…" : "儲存"}
        </button>
        {saved && <span className="text-xs text-up">已儲存 ✓</span>}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wider text-text-dim">{label}</span>
      {children}
    </label>
  );
}
