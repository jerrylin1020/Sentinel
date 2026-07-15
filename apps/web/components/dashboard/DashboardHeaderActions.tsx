"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Matches the `revalidate: 30` fetch cache window used by getSignals()/getWatchlist()
// in lib/api.ts, so we're never refreshing more often than the data can actually change.
const AUTO_REFRESH_MS = 30_000;

export function DashboardHeaderActions() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      // Skip refreshing while the tab isn't visible to avoid wasted work.
      if (document.visibilityState === "visible") {
        startRefresh(() => router.refresh());
      }
    }, AUTO_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [router]);

  async function startScan() {
    setIsScanning(true);
    setScanError(null);
    try {
      const response = await fetch("/api/scan", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || `掃描啟動失敗（${response.status}）`);
      setScanDialogOpen(false);
      startRefresh(() => router.refresh());
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "掃描啟動失敗，請稍後再試。");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="toolbar-button"
        onClick={() => startRefresh(() => router.refresh())}
        disabled={isRefreshing || isScanning}
      >
        {isRefreshing ? "重新整理中…" : "↻ 重新整理"}
      </button>
      <button
        type="button"
        className="toolbar-button toolbar-button-primary"
        onClick={() => { setScanError(null); setScanDialogOpen(true); }}
        disabled={isScanning}
      >
        {isScanning ? "掃描中…" : "立即掃描"}
      </button>
      <ConfirmDialog
        open={scanDialogOpen}
        title={scanError ? "掃描未完成" : "立即掃描觀察名單？"}
        description={scanError ?? "系統會立即掃描目前觀察名單，完成後更新 Dashboard 與訊號列表。掃描期間請勿重複送出。"}
        confirmLabel={scanError ? "再試一次" : "立即開始掃描"}
        confirmTone="primary"
        pending={isScanning}
        pendingTitle="正在掃描觀察名單"
        pendingDescription="正在取得市場資料並評估規則，完成後會自動更新 Dashboard。"
        onCancel={() => { if (!isScanning) setScanDialogOpen(false); }}
        onConfirm={startScan}
      />
    </>
  );
}
