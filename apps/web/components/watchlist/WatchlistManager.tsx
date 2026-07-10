"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiDelete, apiPatch, apiPost, searchSymbols, type ApiSymbolSuggestion, type ApiWatched } from "@/lib/api";

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
  const [error, setError] = useState<string | null>(null);

  // Add-symbol form state
  const [ticker, setTicker] = useState("");
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("equity");
  const [exchange, setExchange] = useState("");
  const [suggestions, setSuggestions] = useState<ApiSymbolSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    const query = ticker.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    if (query === selectedTicker) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const results = await searchSymbols(query, assetType, controller.signal);
        if (controller.signal.aborted) return;
        setSuggestions(results);
        setSuggestionsOpen(true);
        setActiveSuggestion(-1);
      } catch (err) {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSuggestionsOpen(true);
        setSearchError(err instanceof Error ? err.message : "代碼搜尋暫時無法使用");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [ticker, assetType, selectedTicker]);

  function selectSuggestion(suggestion: ApiSymbolSuggestion) {
    setTicker(suggestion.ticker);
    setName(suggestion.name);
    setAssetType(suggestion.asset_type);
    setExchange(suggestion.exchange);
    setSelectedTicker(suggestion.ticker);
    setSuggestions([]);
    setSearchError(null);
    setSuggestionsOpen(false);
  }

  async function addSymbol(e: React.FormEvent) {
    e.preventDefault();
    if (!ticker.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await apiPost("/watchlist", { ticker: ticker.toUpperCase(), name, asset_type: assetType, exchange });
      setTicker(""); setName(""); setExchange("");
      setSelectedTicker(""); setSuggestions([]); setSuggestionsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增標的失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number, t: string) {
    if (!confirm(`確定要刪除 ${t}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/watchlist/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除標的失敗，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 p-6">
      <form onSubmit={addSymbol} className="flex flex-wrap items-end gap-3 border-b border-border pb-5">
        <div className="relative flex flex-col gap-1">
          <label htmlFor="watchlist-ticker" className="text-xs uppercase tracking-wider text-text-dim">Ticker</label>
          <input
            id="watchlist-ticker"
            value={ticker}
            onChange={(e) => {
              setTicker(e.target.value.toUpperCase());
              setSelectedTicker("");
            }}
            onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
            onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
            onKeyDown={(e) => {
              if (!suggestionsOpen || suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveSuggestion((current) => Math.max(current - 1, 0));
              } else if (e.key === "Enter" && activeSuggestion >= 0) {
                e.preventDefault();
                selectSuggestion(suggestions[activeSuggestion]);
              } else if (e.key === "Escape") {
                setSuggestionsOpen(false);
              }
            }}
            placeholder={assetType === "crypto" ? "BTC / ETH" : "NVDA / Apple"}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen}
            aria-controls="ticker-suggestions"
            aria-activedescendant={activeSuggestion >= 0 ? `ticker-suggestion-${activeSuggestion}` : undefined}
            className="w-44 rounded-md border border-border-light bg-panel px-2.5 py-1.5 text-sm"
          />
          {searching && <span className="absolute right-2 top-[30px] text-xs text-text-faint">搜尋中…</span>}
          {suggestionsOpen && suggestions.length > 0 && (
            <ul id="ticker-suggestions" role="listbox" className="absolute left-0 top-full z-30 mt-1 max-h-72 w-80 overflow-y-auto rounded-lg border border-border-light bg-panel shadow-2xl">
              {suggestions.map((suggestion, index) => (
                <li
                  id={`ticker-suggestion-${index}`}
                  key={`${suggestion.asset_type}-${suggestion.ticker}`}
                  role="option"
                  aria-selected={activeSuggestion === index}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`cursor-pointer px-3 py-2.5 ${activeSuggestion === index ? "bg-cyan/10" : "hover:bg-panel-2"}`}
                >
                  <div className="flex items-center gap-2">
                    <strong className="mono text-sm text-text">{suggestion.ticker}</strong>
                    <span className="rounded border border-border-light px-1.5 py-0.5 text-[10px] text-text-dim">{suggestion.asset_type}</span>
                    <span className="ml-auto text-xs text-text-faint">{suggestion.exchange}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-text-dim">{suggestion.name}</p>
                </li>
              ))}
            </ul>
          )}
          {suggestionsOpen && !searching && ticker.trim().length >= 2 && suggestions.length === 0 && ticker !== selectedTicker && (
            <p className={`absolute left-0 top-full z-30 mt-1 w-80 rounded-lg border bg-panel px-3 py-2.5 text-xs shadow-2xl ${searchError ? "border-down/40 text-down" : "border-border-light text-text-dim"}`}>
              {searchError ?? "找不到接近的代碼，仍可手動輸入。"}
            </p>
          )}
        </div>
        <Field label="名稱">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="NVIDIA"
          className="w-36 rounded-md border border-border-light bg-panel px-2.5 py-1.5 text-sm" />
        </Field>
        <Field label="類型">
          <select value={assetType} onChange={(e) => setAssetType(e.target.value)}
            className="rounded-md border border-border-light bg-panel px-2.5 py-1.5 text-sm">
            <option value="equity">equity</option>
            <option value="crypto">crypto</option>
          </select>
        </Field>
        <Field label="交易所">
          <input value={exchange} onChange={(e) => setExchange(e.target.value)} placeholder="NASDAQ / BINANCE"
            className="w-32 rounded-md border border-border-light bg-panel px-2.5 py-1.5 text-sm" />
        </Field>
        <button disabled={busy} className="rounded-md border border-cyan bg-cyan px-3 py-1.5 text-sm font-semibold text-bg hover:bg-blue disabled:opacity-50">
          ＋ 新增標的
        </button>
      </form>
      {error && <p role="alert" className="rounded-md border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">{error}</p>}

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
  const [error, setError] = useState<string | null>(null);

  function toggle(list: string[], setList: (v: string[]) => void, v: string) {
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    setSaved(false);
  }

  // Only show rules that actually apply to this symbol's asset type (e.g. hide crypto-only
  // rules like Funding Rate Spike for equity symbols) instead of listing all 14 unconditionally.
  const applicable = allRules.filter((r) => r.applies_to.includes(item.symbol.asset_type));
  const enabledApplicableCount = applicable.filter((r) => rules.includes(r.id)).length;
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
    setError(null);
    try {
      await apiPatch(`/watchlist/${item.watched.id}`, {
        p1_score_threshold: threshold,
        volume_multiplier: mult,
        channels,
        enabled_rules: rules,
      });
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存失敗，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="flex items-center gap-3">
        <span className="mono text-lg font-semibold">{item.symbol.ticker}</span>
        <span className="text-sm text-text-dim">{item.symbol.name}</span>
        <span className="mono rounded border border-border-light px-1.5 py-0.5 text-[11px] text-text-dim">
          {item.symbol.asset_type}
        </span>
        <button onClick={() => onRemove(item.watched.id, item.symbol.ticker)}
          className="ml-auto rounded-md border border-down/40 px-2 py-1 text-xs text-down hover:bg-down/10">
          刪除
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-4">
        <div className="flex max-w-52 flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-text-dim">P1 門檻</span>
          <input type="number" step="0.5" value={threshold} onChange={(e) => { setThreshold(+e.target.value); setSaved(false); }}
            className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1" />
          <span className="text-[11px] leading-4 text-text-faint">加權分數達 {threshold}，且至少 3 條規則同時觸發，才判定為 P1</span>
        </div>
        <div className="flex max-w-52 flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-text-dim">量倍數</span>
          <input type="number" step="0.1" value={mult} onChange={(e) => { setMult(+e.target.value); setSaved(false); }}
            className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1" />
          <span className="text-[11px] leading-4 text-text-faint">最新日 K 成交量達前 20 根日 K 平均量的 {mult} 倍，才觸發 Volume Spike</span>
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
            {enabledApplicableCount} / {applicable.length} 適用
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
        {error && <span role="alert" className="text-xs text-down">{error}</span>}
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
