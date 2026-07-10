export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-panel ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-border bg-panel-2 px-4 py-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-dim">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Tag({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span title={title} className={`mono rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}
