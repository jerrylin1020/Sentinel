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
    <section className={`rounded-md border border-border bg-panel ${className}`}>
      {title && (
        <header className="flex items-center justify-between border-b border-border bg-panel-2 px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-dim">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

export function Tag({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`mono rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}
