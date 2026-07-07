"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { apiPatch, categoryColor, type ApiRule } from "@/lib/api";

// Human-readable label for each timeframe/data_source combo. Falls back to
// the raw value (e.g. "1d") for any timeframe not listed here.
const timeframeLabel: Record<string, string> = {
  "1d": "日線 1D",
  "8h": "資金費率 8H",
};

const categoryLabel: Record<string, string> = {
  volume: "Volume",
  technical: "Technical",
  flow: "Flow",
  onchain: "On-chain",
  news: "News",
  composite: "Composite",
};

export function RulesManager({ initial }: { initial: ApiRule[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const r of initial) seen.add(r.category);
    return ["all", ...Array.from(seen)];
  }, [initial]);

  const visible = filter === "all" ? initial : initial.filter((r) => r.category === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === c
                ? "border-cyan/50 bg-cyan/10 text-cyan"
                : "border-border-light bg-panel-2 text-text-dim hover:text-text"
            }`}
          >
            {c === "all" ? `全部 (${initial.length})` : categoryLabel[c] ?? c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {visible.map((r) => (
          <RuleCard key={r.id} rule={r} onSaved={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function RuleCard({ rule, onSaved }: { rule: ApiRule; onSaved: () => void }) {
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
    <div
      className={`flex flex-col gap-2.5 rounded-lg border p-3.5 ${
        enabled ? "border-border bg-panel" : "border-border bg-panel/40 opacity-60"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => {
            const v = !enabled;
            setEnabled(v);
            save({ enabled: v });
          }}
          aria-label={enabled ? "停用規則" : "啟用規則"}
          className={`relative h-5 w-[34px] shrink-0 rounded-full border transition-colors ${
            enabled ? "border-up/50 bg-up/15" : "border-border-light bg-panel-3"
          }`}
        >
          <span
            className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${
              enabled ? "left-4 bg-up" : "left-0.5 bg-text-faint"
            }`}
          />
        </button>
        <span className="flex-1 font-semibold">{rule.name}</span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span
          className={`mono rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${
            categoryColor[rule.category] ?? "text-text-dim border-border-light"
          }`}
        >
          {rule.category}
        </span>
        <span
          className="mono rounded border border-border-light bg-panel-2 px-1.5 py-0.5 text-[10px] text-text-dim"
          title="這條規則使用的資料週期 / 來源"
        >
          {timeframeLabel[rule.timeframe] ?? rule.timeframe}
        </span>
        {rule.data_source !== "candles" && (
          <span className="mono rounded border border-purple/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-purple">
            非K線
          </span>
        )}
      </div>

      {rule.description && <p className="text-xs leading-relaxed text-text-dim">{rule.description}</p>}

      {b ? (
        <div className="flex flex-wrap gap-3 border-t border-dashed border-border pt-2 text-[11px] text-text-dim">
          <span>
            勝率 <b className="font-semibold text-up">{(b.win_rate * 100).toFixed(0)}%</b>
          </span>
          <span>
            平均{" "}
            <b className={`font-semibold ${b.avg_return >= 0 ? "text-up" : "text-down"}`}>
              {(b.avg_return * 100).toFixed(1)}%
            </b>
          </span>
          <span>Sharpe {b.sharpe.toFixed(2)}</span>
          <span>樣本 {b.sample_triggers}</span>
        </div>
      ) : (
        <div className="border-t border-dashed border-border pt-2 text-[11px] italic text-text-faint">
          {rule.data_source !== "candles" ? "尚未支援回測（非日K資料來源）" : "尚無回測資料"}
        </div>
      )}

      <details className="group border-t border-border pt-2">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-cyan">
          <span className="inline-block transition-transform group-open:rotate-90">▸</span>
          進階參數
        </summary>
        <div className="mt-2.5 flex flex-wrap items-end gap-3">
          <Field label="權重">
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => {
                setWeight(+e.target.value);
                setSaved(false);
              }}
              className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1 text-sm"
            />
          </Field>
          {Object.entries(params).map(([k, v]) => (
            <Field key={k} label={k}>
              <input
                type="number"
                step="any"
                value={v}
                onChange={(e) => {
                  setParams({ ...params, [k]: +e.target.value });
                  setSaved(false);
                }}
                className="w-24 rounded border border-border-light bg-panel-2 px-2 py-1 text-sm"
              />
            </Field>
          ))}
          <button
            onClick={() => save()}
            disabled={saving}
            className="rounded border border-cyan/50 bg-cyan/10 px-3 py-1 text-xs text-cyan hover:bg-cyan/20 disabled:opacity-50"
          >
            {saving ? "儲存中…" : "儲存"}
          </button>
          {saved && <span className="text-xs text-up">已儲存 ✓</span>}
        </div>
      </details>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-text-dim">{label}</span>
      {children}
    </label>
  );
}
