"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiDelete, apiPatch, apiPost, type ApiWatched } from "@/lib/api";

const CHANNELS = ["telegram", "email", "line"];

type RuleOption = { id: string; name: string; category: string; applies_to: string[] };

// Category display order + accent color (dot + active chip). Falls back to text-dim/gray for unknown categories.
const CATEGORY_ORDER = ["volume", "technical", "flow", "onchain", "news", "composite"];
const CATEGORY_LABEL: Record<string, string> = {
  volume: "Volume", technical: "Technical", flow: "Flow", onchain: "On-chain", news: "News", composite: "Composite",
};
// Static class strings so Tailwind's JIT compiler can see them (dynamic `bg-${x}` template strings won't be detected).
const CATEGORY_STYLE: Record<string, { dot: string; dotActive: string; chipActive: string; chipDotActive: string }> = {
  volume: { dot: "bg-text-faint", dotActive: "bg-cyan", chipActive: "border-cyan/45 bg-cyan/10 text-cyan", chipDotActive: "bg-cyan" },
  technical: { dot: "bg-text-faint", dotActive: "bg-amber", chipActive: "border-amber/45 bg-amber/10 text-amber", chipDotActive: "bg-amber" },
  flow: { dot: "bg-text-faint", dotActive: "bg-purple", chipActive: "border-purple/45 bg-purple/10 text-purple", chipDotActive: "bg-purple" },
  onchain: { dot: "bg-text-faint", dotActive: "bg-up", chipActive: "border-up/45 bg-up/10 text-up", chipDotActive: "bg-up" },
  news: { dot: "bg-text-faint", dotActive: "bg-blue", chipActive: "border-blue/45 bg-blue/10 text-blue", chipDotActive: "bg-blue" },
  composite: { dot: "bg-text-faint", dotActive: "bg-down", chipActive: "border-down/45 bg-down/10 text-down", chipDotActive: "bg-down" },
};
const DEFAULT_CATEGORY_STYLE = { dot: "bg-text-faint", dotActive: "bg-text-dim", chipActive: "border-border-light bg-panel-3 text-text", chipDotActive: "bg-text-dim" };

export function WatchlistManager({
  initial,
  allRules,
}: {
  initial: ApiWatched[];
  allRules: RuleOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  // Add-symbol form state
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("equity");
  const [exchange, setExchange] = useState("");

  async function addSymbol(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    setBusy(true);
    await apiPost("/watchlist", { ticker: ticker.toUpperCase(), name, asset_type: assetType, exchange });
    setTicker(""); setName(""); setExchange("");
    setBusy(false);
    router.refresh();
  }

  async function remove(id: number, t: string) {
    if (!confirm(`確定要刪除 ${t}?`)) return;
    setBusy(true);
    await apiDelete(`/watchlist/${id}`);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addSymbol} className="flex flex-wrap items-end gap-2 rounded border border-border bg-panel-2 p-3">
        <Field label="Ticker">
          <input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="NVDA / BTCUSDT"
            className="w-32 rounded border border-border-light bg-panel px-2 py-1" />
        </Field>
        <Field label="名稱">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NVIDIA"
            className="w-36 rounded border border-border-light bg-panel px-2 py-1" />
        </Field>
        <Field label="類型">
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)}
            className="rounded border border-border-light bg-panel px-2 py-1">
            <option value="equity">equity</option>
            <option value="crypto">crypto</option>
          </select>
        </Field>
        <Field label="交易所">
          <input value={exchange} onChange={(e) => setExchange(e.target.value)} placeholder="NASDAQ / BINANCE"
            className="w-32 rounded border border-border-light bg-panel px-2 py-1" />
        </Field>
        <button disabled={busy} className="rounded border border-up/50 bg-up/10 px-3 py-1 text-up hover:bg-up/20 disabled:opacity-50">
          ＋ 新增標的
        </button>
      </form>

      <div className="space-y-2">
        {initial.map((it) => (
          <Row key={it.watched.id} item={it} allRules={allRules} onRemove={remove} onSaved={() => router.refresh()} />
        ))}
        {initial.length === 0 && <p className="text-sm text-text-dim">觀察名單是空的，用上面的表單新增。</p>}
      </div>
    </div>
  );
}

function Row({
  item,
  allRules,
  onRemove,
  onSaved,
}: {
  item: ApiWatched;
  allRules: RuleOption[];
  onRemove: (id: number, t: string) => void;
  onSaved: () => void;
}) {
  const [threshold, setThreshold] = useState(item.watched.p1_score_threshold);
  const [mult, setMult] = useState(item.watched.volume_multiplier);
  const [channels, setChannels] = useState<string[]>(item.watched.channels);
  const [rules, setRules] = useState<string[]>(item.watched.enabled_rules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    setSaved(false);
  }

  // Only show rules that actually apply to this symbol's asset type (e.g. hide crypto-only
  // rules like Funding Rate Spike for equity symbols) instead of listing all 14 unconditionally.
  const applicable = allRules.filter((r) => r.applies_to.includes(item.symbol.asset_type));
  const excludedCount = allRules.length - applicable.length;
  const groupedRules = CATEGORY_ORDER.map((cat) => [cat, applicable.filter((r) => r.category === cat)] as const)
    .filter(([, list]) => list.length > 0)
    .concat(
      applicable
        .filter((r) => !CATEGORY_ORDER.includes(r.category))
        .reduce<Array<readonly [string, RuleOption[]]>>((acc, r) => {
          const existing = acc.find(([c]) => c === r.category);
          if (existing) existing[1].push(r);
          else acc.push([r.category, [r]]);
          return acc;
        }, [])
    );

  async function save() {
    setSaving(true);
    await apiPatch(`/watchlist/${item.watched.id}`, {
      p1_score_threshold: threshold,
      volume_multiplier: mult,
      channels,
      enabled_rules: rules,
    });
    setSaving(false);
    setSaved(true);
    onSaved();
  }

  return (
    <div className="rounded border border-border bg-panel p-3">
      <div className="flex items-center gap-3">
        <span className="mono text-lg font-semibold">{item.symbol.ticker}</span>
        <span className="text-sm text-text-dim">{item.symbol.name}</span>
        <span className="mono rounded border border-border-light px-1.5 py-0.5 text-[11px] text-text-dim">
          {item.symbol.asset_type}
        </span>
        <button onClick={() => onRemove(item.watched.id, item.symbol.ticker)}
          className="ml-auto rounded border border-down/40 px-2 py-1 text-xs text-down hover:bg-down/10">
          刪除
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        <Field label="P1 門檻">
          <input type="number" step="0.5" value={threshold} onChange={(e) => { setThreshold(+e.target.value); setSaved(false); }}
            className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1" />
        </Field>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-text-dim">量倍數</span>
          <input type="number" step="0.1" value={mult} onChange={(e) => { setMult(+e.target.value); setSaved(false); }}
            className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1" />
          <span className="text-[11px] text-text-faint">只影響 Volume Spike 規則</span>
        </div>
        <Field label="推播">
          <div className="flex gap-2">
            {CHANNELS.map((c) => (
              <label key={c} className="flex items-center gap-1 text-xs text-text-dim">
                <input type="checkbox" checked={channels.includes(c)} onChange={() => toggle(channels, setChannels, c)} />
                {c}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-text-dim">啟用規則</span>
          <span className="mono text-xs text-up">
            {rules.length} / {applicable.length} 適用
          </span>
          {excludedCount > 0 && (
            <span className="text-[11px] text-text-faint">
              僅顯示適用於 {item.symbol.asset_type} 的規則（已自動排除 {excludedCount} 條不適用規則）
            </span>
          )}
        </div>

        <div className="space-y-2">
          {groupedRules.map(([category, ruleList]) => {
            const style = CATEGORY_STYLE[category] ?? DEFAULT_CATEGORY_STYLE;
            const allOn = ruleList.every((r) => rules.includes(r.id));
            return (
              <div key={category} className="rounded border border-border overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-panel-2 px-2.5 py-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dotActive}`} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-text-dim">
                    {CATEGORY_LABEL[category] ?? category}
                  </span>
                  <div className="ml-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const ids = ruleList.map((r) => r.id);
                        setRules(allOn ? rules.filter((r) => !ids.includes(r)) : Array.from(new Set([...rules, ...ids])));
                        setSaved(false);
                      }}
                      className="text-[11px] text-text-faint underline hover:text-cyan"
                    >
                      {allOn ? "清空" : "全選"}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2">
                  {ruleList.map((r) => {
                    const active = rules.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggle(rules, setRules, r.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          active ? style.chipActive : "border-border-light bg-panel-3 text-text-faint"
                        }`}
                      >
                        <span className={`h-1 w-1 rounded-full ${active ? style.chipDotActive : "bg-text-faint"}`} />
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button onClick={save} disabled={saving}
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
