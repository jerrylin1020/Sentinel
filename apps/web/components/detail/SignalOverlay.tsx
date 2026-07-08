"use client";

import { useEffect, useMemo, useState } from "react";
import { CandleChart, type ChartMarker } from "@/components/charts/CandleChart";
import { Panel, Tag } from "@/components/ui/Panel";
import { categoryColor, type ApiSignal } from "@/lib/api";
import { severityColor } from "@/lib/fixtures";

const markerColor: Record<string, string> = { p1: "#ff3b58", p2: "#ffb627", observe: "#7a839a" };

const SEVERITY_INFO: Record<string, string> = {
  p1: "P1・高信心：多條規則同時觸發，或單一規則權重極高，值得優先關注。",
  p2: "P2・中信心：規則觸發但分數中等，可能只是單一較弱訊號。",
  observe: "Observe・觀察：分數低於 P2 門檻，僅供留意，非明確異常。",
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function SignalOverlay({ symbol, related }: { symbol: string; related: ApiSignal[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

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


  const markers: ChartMarker[] = numbered.map(({ signal: s, index }) => ({
    time: new Date(s.triggered_at).toISOString().slice(0, 10),
    position: "aboveBar",
    color: markerColor[s.severity] ?? "#7a839a",
    shape: "circle",
    text: `#${index}`,
    id: String(s.id),
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="K 線圖 · 日線 (訊號疊加，點擊圓點對應右側訊號)" className="lg:col-span-2">
        <CandleChart ticker={symbol} markers={markers} onMarkerClick={(id) => setSelectedId(Number(id))} />
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
                  <Tag className={severityColor[s.severity]}>{s.severity}</Tag>
                  <span className="mono">{s.score.toFixed(1)}</span>
                  <span className="mono ml-auto text-text-faint">{fmtTime(s.triggered_at)}</span>
                </div>
                <ul className="mt-2 space-y-1">
                  {s.rules.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 text-xs">
                      <Tag className={categoryColor[r.category] ?? "text-text-dim border-border-light"}>{r.name}</Tag>
                      <span className="text-text-dim">{r.detail || "—"}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
