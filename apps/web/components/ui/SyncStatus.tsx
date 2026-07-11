type SyncStatusProps = {
  active: boolean;
  label: string;
};

export function SyncStatus({ active, label }: SyncStatusProps) {
  if (!active) return null;

  return (
    <div className="sync-status" role="status" aria-live="polite">
      <span className="sync-status-dot" aria-hidden="true" />
      <span>{label}</span>
      <span className="sync-status-bars" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}
