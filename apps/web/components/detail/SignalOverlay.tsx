"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CandleChart, type ChartMarker } from "@/components/charts/CandleChart";
import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, type ApiSignal } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";
import { fmtDateTime, fmtTaipeiDate } from "@/lib/format";

const markerColor: Record<string, string> = { p1: "#ff3b58", p2: "#ffb627", observe: "#7a839a" };

const SEVERITY_INFO: Record<string, string> = {
  p1: "P1 追蹤訊號：至少 3 條規則合流，且最終分數達到此標的的 P1 門檻。",
  p2: "P2 追蹤訊號：至少一條標準或強觸發，但尚未同時滿足 P1 分數與規則數門檻。",
  observe: "Observe 追蹤訊號：只有觀察強度的規則觸發，僅記錄、不推播。",
};

const triggerSeverityLabel = { p1: "強", p2: "標準", observe: "觀察" } as const;
const triggerSeverityStyle = {
  p1: "border-p1/40 bg-p1/10 text-p1",
  p2: "border-p2/40 bg-p2/10 text-p2",
  observe: "border-border-light bg-panel-3 text-text-dim",
} as const;
const observeRuleIds = new Set(["gap_up", "long_green_candle", "price_momentum"]);

function getRuleTriggerSeverity(rule: ApiSignal["rules"][number]) {
  return rule.trigger_severity ?? (observeRuleIds.has(rule.id) ? "observe" : "p2");
}

function fmtTime(iso: string) {
  return fmtDateTime(iso);
}

export function SignalOverlay({
  symbol,
  related,
  exchange,
  p1Threshold,
}: {
  symbol: string;
  related: ApiSignal[];
  exchange?: string;
  p1Threshold: number;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // TradingView blocks iframing its full chart app (frame-ancestors: none), even for saved
  // layouts / logged-in accounts — so we can't embed it. Opening it in a new tab, however,
  // inherits the user's existing TradingView session (subscription, saved indicators, etc).
  const tradingViewUrl = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(
    exchange ? `${exchange}:${symbol}` : symbol,
  )}`;

  // Number signals in the order they're listed (newest first from the API) so the same
  // index badge appears both on the chart marker and the sidebar card — this is what makes
  // it possible to tell which signal on the chart corresponds to which rule breakdown below.
  const numbered = useMemo(() => related.map((s, i) => ({ signal: s, index: i + 1 })), [related]);

  // Deep-link support: /detail/NVDA#signal-123 (linked from the Signals list) selects and
  // scrolls to the specific signal so clicking a row always lands on the exact trigger.
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#signal-(\d+)$/);
    if (!match) return;
    const id = Number(match[1]);
    setSelectedId(id);
    document.getElementById(`signal-${id}`)?.scrollIntoView({ block: "nearest" });
  }, []);


  const markers: ChartMarker[] = useMemo(
    () =>
      numbered.map(({ signal: s, index }) => ({
        time: fmtTaipeiDate(s.triggered_at),
        position: "aboveBar" as const,
        color: markerColor[s.severity] ?? "#7a839a",
        shape: "circle" as const,
        text: `#${index}`,
        id: String(s.id),
      })),
    [numbered],
  );

  const handleMarkerClick = useCallback((id: string) => setSelectedId(Number(id)), []);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel
        title="K 線圖 · 日線 (訊號疊加，點擊圓點對應右側訊號)"
        className="lg:col-span-2"
        action={
          <a
            href={tradingViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-border-light px-2 py-1 text-[11px] text-text-dim transition-colors hover:border-cyan/40 hover:text-cyan"
            title="在新分頁開啟 TradingView（會使用你自己的登入/訂閱）"
          >
            在 TradingView 開啟 ↗
          </a>
        }
      >
        <CandleChart ticker={symbol} markers={markers} onMarkerClick={handleMarkerClick} />
        <div className="mt-2 flex flex-wrap gap-3 border-t border-border pt-2 text-[11px] text-text-faint">
          {(["p1", "p2", "observe"] as const).map((sev) => (
            <span key={sev} className="flex items-center gap-1" title={SEVERITY_INFO[sev]}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: markerColor[sev] }} />
              {sev.toUpperCase()}
            </span>
          ))}
          <span className="text-text-faint">滑鼠移到上方文字看說明；圖上數字對應右側清單編號</span>
        </div>
      </Panel>

      <Panel title={`觸發訊號 (${related.length})`}>
        {related.length === 0 ? (
          <p className="text-sm text-text-dim">此標的目前沒有訊號。</p>
        ) : (
          <ul className="space-y-3">
            {numbered.map(({ signal: s, index }) => (
              <li
                key={s.id}
                id={`signal-${s.id}`}
                className={`cursor-pointer rounded border p-2 transition-colors ${
                  selectedId === s.id ? "border-cyan/60 bg-cyan/10" : "border-border bg-panel-2"
                }`}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="mono flex h-5 w-5 items-center justify-center rounded-full border border-border-light text-[11px] text-text-dim">
                    {index}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-text-faint">追蹤訊號</span>
                  <Tag className={severityColor[s.severity]}>{s.severity.toUpperCase()}</Tag>
                  <span className="mono">{s.score.toFixed(1)}</span>
                  <span className="mono ml-auto text-text-faint">{fmtTime(s.triggered_at)}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {s.rules.map((r) => (
                    <li key={r.id} className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 border-b border-border/70 pb-2 text-xs last:border-0 last:pb-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <Tag className={categoryColor[r.category] ?? "text-text-dim border-border-light"}>{r.name}</Tag>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] ${triggerSeverityStyle[getRuleTriggerSeverity(r)]}`}>
                          規則強度：{triggerSeverityLabel[getRuleTriggerSeverity(r)]}
                        </span>
                      </div>
                      <span className="mono text-cyan">+{(r.contribution ?? s.components[r.id] ?? 0).toFixed(2)}</span>
                      <span className="col-span-2 text-text-dim">{r.detail || "—"}</span>
                    </li>
                  ))}
                </ul>
                <ScoreBreakdown signal={s} p1Threshold={p1Threshold} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ScoreBreakdown({ signal, p1Threshold }: { signal: ApiSignal; p1Threshold: number }) {
  const baseScore = Object.values(signal.components).reduce((sum, value) => sum + value, 0);
  const hasConfluenceBonus = signal.rules.length >= 3;
  const bonus = Math.max(0, signal.score - baseScore);

  return (
    <div className="mt-2 rounded border border-border bg-bg/50 p-2 text-[11px]">
      <p className="mb-1.5 font-semibold text-text">追蹤訊號計分明細</p>
      <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-text-dim">
        <span>規則貢獻合計</span><span className="mono text-text">{baseScore.toFixed(2)}</span>
        <span>{hasConfluenceBonus ? `${signal.rules.length} 條規則合流加成（15%）` : `規則合流加成（未滿 3 條）`}</span>
        <span className={`mono ${hasConfluenceBonus ? "text-up" : "text-text-faint"}`}>{hasConfluenceBonus ? `+${bonus.toFixed(2)}` : "+0.00"}</span>
        <span className="border-t border-border pt-1 font-semibold text-text">最終分數</span>
        <span className="mono border-t border-border pt-1 font-semibold text-cyan">{signal.score.toFixed(2)}</span>
        <span>P1 判定門檻</span><span className="mono">{p1Threshold.toFixed(2)} ＋ 至少 3 條</span>
      </div>
      <p className={`mt-2 font-semibold ${signal.severity === "p1" ? "text-p1" : signal.severity === "p2" ? "text-p2" : "text-text-dim"}`}>
        判定結果：{signal.severity.toUpperCase()} 追蹤訊號
      </p>
    </div>
  );
}
