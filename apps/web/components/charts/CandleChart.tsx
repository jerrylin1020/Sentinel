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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
    for (const m of markers) {
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
    fetch(`${BASE}/candles/${encodeURIComponent(ticker)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (disposed || !Array.isArray(data) || data.length === 0) {
          setError(true);
          return;
        }
        series.setData(
          data.map((d) => ({ time: d.time as Time, open: d.open, high: d.high, low: d.low, close: d.close })),
        );
        if (markers.length) createSeriesMarkers(series, markers);
        chart.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => setError(true));

    return () => {
      disposed = true;
      if (onMarkerClick) chart.unsubscribeClick(handleClick);
      chart.remove();
    };
  }, [ticker, markers, onMarkerClick]);

  return (
    <div className="relative">
      <div ref={ref} className="w-full" />
      {(loading || error) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-text-faint">
          {error ? "無法載入 K 線資料" : "載入中…"}
        </div>
      )}
    </div>
  );
}
