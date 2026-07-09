"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ChartMarker = SeriesMarker<Time>;

// Stable empty-array reference so the "not 1d" branch below doesn't create a
// new array literal every render — a fresh `[]` each render would be a new
// object identity, which (being in the effect's dependency array) caused the
// effect to tear down and re-fetch on every render, looping forever and
// leaving 1H/1W/1M stuck on "載入中…" (only 1d worked, since it reuses the
// `markers` prop's stable reference instead of a literal).
const EMPTY_MARKERS: ChartMarker[] = [];

const TIMEFRAMES = [
  { id: "1h", label: "1H" },
  { id: "1d", label: "1D" },
  { id: "1w", label: "1W" },
  { id: "1M", label: "1M" },
] as const;
type TimeframeId = (typeof TIMEFRAMES)[number]["id"];

export function CandleChart({
  ticker,
  markers = [],
  onMarkerClick,
}: {
  ticker: string;
  markers?: ChartMarker[];
  onMarkerClick?: (markerId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<TimeframeId>("1d");

  // Rules only ever evaluate daily bars, so the recorded signal dates only line up with the
  // "1d" series. Overlaying them on 1H/1W/1M bars would point at the wrong candle, so we only
  // show markers in daily view and tell the user why they disappear otherwise.
  const activeMarkers = timeframe === "1d" ? markers : EMPTY_MARKERS;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setLoading(true);
    setError(false);

    const chart = createChart(el, {
      layout: { background: { type: ColorType.Solid, color: "#0f1422" }, textColor: "#7a839a" },
      grid: { vertLines: { color: "#1e2638" }, horzLines: { color: "#1e2638" } },
      rightPriceScale: { borderColor: "#1e2638" },
      timeScale: { borderColor: "#1e2638" },
      width: el.clientWidth,
      height: 320,
      autoSize: true,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#00d97e",
      downColor: "#ff3b58",
      borderVisible: false,
      wickUpColor: "#00d97e",
      wickDownColor: "#ff3b58",
    });

    // Markers can share the same date (multiple signals same day); index them by time
    // so a click on the chart can be resolved back to the specific signal(s) at that bar.
    const markersByTime = new Map<string, ChartMarker[]>();
    for (const m of activeMarkers) {
      const key = String(m.time);
      const list = markersByTime.get(key) ?? [];
      list.push(m);
      markersByTime.set(key, list);
    }
    function handleClick(param: MouseEventParams<Time>) {
      if (!param.time || !onMarkerClick) return;
      const hit = markersByTime.get(String(param.time));
      if (hit && hit.length > 0) {
        // Multiple signals can land on the same bar; surface the first one's id and let the
        // caller decide how to highlight (the sidebar list groups by the same date anyway).
        onMarkerClick(hit[0].id ?? "");
      }
    }
    if (onMarkerClick) chart.subscribeClick(handleClick);

    let disposed = false;
    fetch(`${BASE}/candles/${encodeURIComponent(ticker)}?timeframe=${timeframe}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        // A stale effect (e.g. React StrictMode's dev-mode double-invoke, or a fast
        // ticker/timeframe switch) may still resolve after cleanup ran — ignore it
        // entirely rather than clobbering the state set by the current, live effect.
        if (disposed) return;
        if (!Array.isArray(data) || data.length === 0) {
          setError(true);
          return;
        }
        series.setData(
          data.map((d) => ({ time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close })),
        );
        if (activeMarkers.length) createSeriesMarkers(series, activeMarkers);
        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => {
        if (!disposed) setError(true);
      });

    return () => {
      disposed = true;
      if (onMarkerClick) chart.unsubscribeClick(handleClick);
      chart.remove();
    };
  }, [ticker, timeframe, activeMarkers, onMarkerClick]);

  return (
    <div className="relative">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex gap-1 rounded border border-border-light bg-panel-2 p-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setTimeframe(tf.id)}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                timeframe === tf.id ? "bg-cyan/15 text-cyan" : "text-text-faint hover:text-text-dim"
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
        {markers.length > 0 && timeframe !== "1d" && (
          <span className="text-[11px] text-text-faint">訊號標記僅顯示於日線（規則皆以日K計算）</span>
        )}
      </div>
      <div ref={ref} className="w-full" />
      {(loading || error) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-faint">
          {error ? "無法載入 K 線資料" : "載入中…"}
        </div>
      )}
    </div>
  );
}
