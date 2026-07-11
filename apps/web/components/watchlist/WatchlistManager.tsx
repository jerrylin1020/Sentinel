"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { apiDelete, apiPatch, apiPost, searchSymbols, type ApiSymbolSuggestion, type ApiWatched } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { OperationLoadingDialog } from "@/components/ui/OperationLoadingDialog";
import { SyncStatus } from "@/components/ui/SyncStatus";

const CHANNELS = ["telegram", "email", "line"];

type RuleOption = { id: string; name: string; category: string; applies_to: string[] };
type CreatedWatchlistResponse = ApiWatched | (ApiWatched["watched"] & { symbol_id?: number });

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
  const [isRefreshing, startRefresh] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<number>>(() => new Set());
  const [addedItems, setAddedItems] = useState<ApiWatched[]>([]);
  const [pendingAddition, setPendingAddition] = useState<{ ticker: string; name: string; assetType: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: number; ticker: string } | null>(null);
  const initialIds = new Set(initial.map((item) => item.watched.id));
  const visibleItems = [
    ...initial.filter((item) => !removedIds.has(item.watched.id)),
    ...addedItems.filter((item) => !initialIds.has(item.watched.id) && !removedIds.has(item.watched.id)),
  ].filter(isCompleteWatchlistItem);
  const watchedSymbols = new Set(visibleItems.map((item) => `${item.symbol.asset_type}:${item.symbol.ticker.toUpperCase()}`));

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
  const [tickerFilter, setTickerFilter] = useState("");
  const [assetFilter, setAssetFilter] = useState<"all" | "equity" | "crypto">("all");
  const [sortBy, setSortBy] = useState<"recent" | "ticker" | "threshold" | "volume">("recent");

  const filteredItems = [...visibleItems]
    .filter((item) => {
      const matchesTicker = item.symbol.ticker.toUpperCase().includes(tickerFilter.trim().toUpperCase());
      const matchesAssetType = assetFilter === "all" || item.symbol.asset_type === assetFilter;
      return matchesTicker && matchesAssetType;
    })
    .sort((a, b) => {
      if (sortBy === "ticker") return a.symbol.ticker.localeCompare(b.symbol.ticker);
      if (sortBy === "threshold") return b.watched.p1_score_threshold - a.watched.p1_score_threshold;
      if (sortBy === "volume") return b.watched.volume_multiplier - a.watched.volume_multiplier;
      return 0;
    });

  function refreshWatchlist() {
    startRefresh(() => router.refresh());
  }

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
    const nextTicker = ticker.toUpperCase();
    if (watchedSymbols.has(`${assetType}:${nextTicker}`)) {
      setError(`${nextTicker} 已在觀察名單中，無法重複新增。`);
      return;
    }
    setIsAdding(true);
    setPendingAddition({ ticker: nextTicker, name, assetType });
    setError(null);
    try {
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const response = await apiPost("/watchlist", { ticker: nextTicker, name, asset_type: assetType, exchange });
      const added = normalizeCreatedWatchlist(
        (await response.json()) as CreatedWatchlistResponse,
        { ticker: nextTicker, name, assetType, exchange },
      );
      setAddedItems((current) => [...current.filter((item) => item.watched.id !== added.watched.id), added]);
      setTicker(""); setName(""); setExchange("");
      setSelectedTicker(""); setSuggestions([]); setSuggestionsOpen(false);
      refreshWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增標的失敗，請稍後再試。");
    } finally {
      setPendingAddition(null);
      setIsAdding(false);
    }
  }

  async function remove() {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiDelete(`/watchlist/${pendingDelete.id}`);
      setRemovedIds((current) => new Set(current).add(pendingDelete.id));
      setAddedItems((current) => current.filter((item) => item.watched.id !== pendingDelete.id));
      setPendingDelete(null);
      refreshWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除標的失敗，請稍後再試。");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div>
      <header className="page-heading"><div><h1>觀察名單</h1><p>{visibleItems.length} 個標的 · 管理個別告警門檻與推播通路</p></div></header>
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
        <button disabled={isAdding} className="inline-flex items-center gap-2 rounded-md border border-cyan bg-cyan px-3 py-1.5 text-sm font-semibold text-bg hover:bg-blue disabled:opacity-50">
          {isAdding && <span className="loading-orbit border-bg/35 border-t-bg" aria-hidden="true" />}
          {isAdding ? "新增中…" : "＋ 新增標的"}
        </button>
      </form>
      {error && <p role="alert" className="rounded-md border border-down/40 bg-down/10 px-3 py-2 text-xs text-down">{error}</p>}

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2.5">
        <label htmlFor="watchlist-filter" className="sr-only">篩選代碼</label>
        <input
          id="watchlist-filter"
          value={tickerFilter}
          onChange={(event) => setTickerFilter(event.target.value.toUpperCase())}
          placeholder="⌕ 篩選代碼，例如 NVDA"
          className="w-52 rounded-md border border-border-light bg-bg px-2.5 py-1.5 text-sm placeholder:text-text-faint"
        />
        <span className="font-mono text-xs text-text-dim">{filteredItems.length} / {visibleItems.length} 個標的</span>
        <span className="hidden h-5 border-l border-border sm:block" />
        <span className="text-xs text-text-dim">只顯示</span>
        {(["all", "equity", "crypto"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAssetFilter(type)}
            className={`rounded-md border px-2.5 py-1.5 text-xs transition-colors ${assetFilter === type ? "border-cyan/60 bg-cyan/10 text-cyan" : "border-transparent text-text-dim hover:border-border-light hover:bg-panel-2"}`}
          >
            {type === "all" ? "全部" : type === "equity" ? "Stock" : "Crypto"}
          </button>
        ))}
        <span className="ml-auto text-xs text-text-dim">排序</span>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          className="rounded-md border border-border-light bg-bg px-2.5 py-1.5 text-sm"
        >
          <option value="recent">最近新增</option>
          <option value="ticker">代碼 A → Z</option>
          <option value="threshold">P1 門檻（高 → 低）</option>
          <option value="volume">量倍數（高 → 低）</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {filteredItems.map((it) => (
          <Row key={it.watched.id} item={it} allRules={allRules} onRemove={(id, ticker) => setPendingDelete({ id, ticker })} onSaved={refreshWatchlist} />
        ))}
        {pendingAddition && <PendingRow item={pendingAddition} />}
        {visibleItems.length === 0 && <p className="text-sm text-text-dim">觀察名單是空的，用上面的表單新增。</p>}
        {visibleItems.length > 0 && filteredItems.length === 0 && <p className="py-12 text-center text-sm text-text-dim xl:col-span-2">找不到符合的標的，請調整篩選條件。</p>}
      </div>
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={`移除 ${pendingDelete?.ticker ?? "標的"}？`}
        description="此操作會將標的從觀察名單移除；歷史訊號與分析資料會保留。"
        confirmLabel="確認移除"
        pending={isDeleting}
        pendingTitle={`正在移除 ${pendingDelete?.ticker ?? "標的"}`}
        pendingDescription="正在同步觀察名單，請稍候…"
        onCancel={() => setPendingDelete(null)}
        onConfirm={remove}
      />
      <OperationLoadingDialog
        open={isAdding}
        title={`正在新增 ${pendingAddition?.ticker ?? "標的"}`}
        description="正在同步觀察名單，請稍候…"
      />
      <SyncStatus active={isRefreshing} label="正在同步觀察名單" />
    </div>
  );
}

function normalizeCreatedWatchlist(
  response: CreatedWatchlistResponse,
  fallback: { ticker: string; name: string; assetType: string; exchange: string },
): ApiWatched {
  if ("symbol" in response && "watched" in response && response.symbol) return response;

  const watched = response as ApiWatched["watched"] & { symbol_id?: number };
  return {
    watched,
    symbol: {
      id: watched.symbol_id ?? -watched.id,
      ticker: fallback.ticker,
      name: fallback.name || fallback.ticker,
      asset_type: fallback.assetType,
      exchange: fallback.exchange,
    },
  };
}

function isCompleteWatchlistItem(item: ApiWatched): item is ApiWatched {
  return Boolean(item?.watched && item.symbol && typeof item.symbol.ticker === "string");
}

function PendingRow({ item }: { item: { ticker: string; name: string; assetType: string } }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-cyan/35 bg-cyan/[0.05] p-4 text-text-dim" role="status" aria-live="polite">
      <span className="loading-orbit" aria-hidden="true" />
      <span className="mono text-lg font-semibold text-text">{item.ticker}</span>
      <span className="text-sm">{item.name || "正在建立標的"}</span>
      <span className="mono rounded border border-border-light px-1.5 py-0.5 text-[11px]">{item.assetType}</span>
      <span className="ml-auto text-xs text-cyan">正在新增…</span>
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
  const [rulesExpanded, setRulesExpanded] = useState(false);

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
  const rulesSummary = groupedRules
    .map(([category, ruleList]) => `${CATEGORY_LABEL[category] ?? category} ${ruleList.filter((rule) => rules.includes(rule.id)).length}/${ruleList.length}`)
    .join(" · ");

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
        <span className="min-w-0 truncate text-sm text-text-dim">{item.symbol.name}</span>
        <span className="mono rounded border border-border-light px-1.5 py-0.5 text-[11px] text-text-dim">
          {item.symbol.asset_type}
        </span>
        <button onClick={() => onRemove(item.watched.id, item.symbol.ticker)}
          className="ml-auto rounded-md border border-down/40 px-2 py-1 text-xs text-down hover:bg-down/10">
          刪除
        </button>
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wider text-text-dim">P1 門檻</span>
          <input type="number" step="0.5" value={threshold} onChange={(e) => { setThreshold(+e.target.value); setSaved(false); }}
            className="w-20 rounded border border-border-light bg-panel-2 px-2 py-1" />
          <span className="text-[11px] leading-4 text-text-faint">加權分數達 {threshold}，且至少 3 條規則同時觸發，才判定為 P1</span>
        </div>
        <div className="flex flex-col gap-1">
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
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-text-dim">啟用規則 <span className="mono text-up">{enabledApplicableCount} / {applicable.length}</span></p>
            <p className="mt-1 truncate text-[11px] text-text-faint">{rulesSummary}</p>
          </div>
          <button
            type="button"
            onClick={() => setRulesExpanded((current) => !current)}
            aria-expanded={rulesExpanded}
            className="shrink-0 text-xs text-cyan hover:text-blue"
          >
            {rulesExpanded ? "收合規則 ↑" : "展開規則 ↓"}
          </button>
        </div>

        {rulesExpanded && <div className="mt-3 space-y-2">
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
          {excludedCount > 0 && <p className="text-[11px] text-text-faint">已自動排除 {excludedCount} 條不適用於 {item.symbol.asset_type} 的規則。</p>}
        </div>}
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
