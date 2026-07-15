"use client";

import { useEffect, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmTone?: "danger" | "primary";
  pending?: boolean;
  pendingTitle?: string;
  pendingDescription?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmTone = "danger",
  pending = false,
  pendingTitle,
  pendingDescription,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description" className="w-full max-w-md rounded-xl border border-border-light bg-panel shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <p className="section-label text-p1">{pending ? "同步中" : "確認操作"}</p>
          {pending && <span className="dialog-loading-orbit" aria-hidden="true" />}
          <h2 id="confirm-dialog-title" className="mt-1 text-lg font-semibold text-text">{pending ? pendingTitle ?? title : title}</h2>
        </div>
        <p id="confirm-dialog-description" className="px-5 py-4 text-sm leading-6 text-text-dim">{pending ? pendingDescription ?? description : description}</p>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button ref={cancelRef} type="button" disabled={pending} onClick={onCancel} className="rounded-md border border-border-light px-3.5 py-2 text-sm text-text-dim transition-colors hover:bg-panel-2 hover:text-text disabled:opacity-50">
            取消
          </button>
          <button type="button" disabled={pending} onClick={onConfirm} className={`rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${confirmTone === "danger" ? "border-down/50 bg-down/10 text-down hover:bg-down/20" : "border-cyan/50 bg-cyan/10 text-cyan hover:bg-cyan/20"}`}>
            {pending ? "處理中…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
