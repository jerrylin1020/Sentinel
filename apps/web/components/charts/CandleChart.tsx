"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  createSeriesMarkers,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ChartMarker = SeriesMarker<Time>;

export function CandleChart({ ticker, markers = [] }: { ticker: string; markers?: ChartMarker[] }) {
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
      chart.remove();
    };
  }, [ticker, markers]);

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
